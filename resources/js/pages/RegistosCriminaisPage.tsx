import axios from "axios";
import {
    AlertCircle,
    CheckCircle2,
    Download,
    Eye,
    FileCheck2,
    FileClock,
    FileWarning,
    LoaderCircle,
    Plus,
    RefreshCw,
    Search,
    ShieldCheck,
    XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";
import {
    downloadAuthenticatedFile,
    openAuthenticatedFile,
} from "../lib/authenticatedFile";
import { useAuth } from "../contexts/AuthContext";
import { useTenant } from "../contexts/TenantContext";
import RegistoCriminalUploadModal from "../components/registos-criminais/RegistoCriminalUploadModal";
import type { Motorista } from "../types/motorista";
import type {
    RegistoCriminal,
    RegistoCriminalStatus,
    RegistoCriminalValidade,
} from "../types/registo-criminal";

type StatusFilter = "todos" | RegistoCriminalStatus;

type ValidadeFilter = "todas" | RegistoCriminalValidade;

const statusLabel: Record<RegistoCriminalStatus, string> = {
    pendente_validacao: "Em validação",
    validado: "Validado",
    rejeitado: "Rejeitado",
};

const statusClass: Record<RegistoCriminalStatus, string> = {
    pendente_validacao: "bg-amber-50 text-amber-700",
    validado: "bg-emerald-50 text-emerald-700",
    rejeitado: "bg-red-50 text-red-700",
};

const validadeLabel: Record<RegistoCriminalValidade, string> = {
    valido: "Válido",
    a_expirar: "A expirar",
    expirado: "Expirado",
};

const validadeClass: Record<RegistoCriminalValidade, string> = {
    valido: "bg-emerald-50 text-emerald-700",
    a_expirar: "bg-orange-50 text-orange-700",
    expirado: "bg-red-50 text-red-700",
};

function apiError(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const errors = error.response?.data?.errors;

        if (errors) {
            const first = Object.values(errors)[0];

            if (Array.isArray(first) && first.length) {
                return String(first[0]);
            }
        }

        return (
            error.response?.data?.message ??
            "Não foi possível concluir a operação."
        );
    }

    return "Não foi possível concluir a operação.";
}

function formatDate(value: string | null): string {
    if (!value) {
        return "—";
    }

    const raw = value.length >= 10 ? value.slice(0, 10) : value;

    const [year, month, day] = raw.split("-");

    if (!year || !month || !day) {
        return value;
    }

    return `${day}/${month}/${year}`;
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(0)} KB`;
    }

    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function RegistosCriminaisPage() {
    const { user } = useAuth();

    const { tenant } = useTenant();

    const queryClient = useQueryClient();

    const [search, setSearch] = useState("");

    const [status, setStatus] = useState<StatusFilter>("todos");

    const [validade, setValidade] = useState<ValidadeFilter>("todas");

    const [uploadOpen, setUploadOpen] = useState(false);

    const hasMotoristaRole = Boolean(
        user?.roles?.some((role) => role.codigo === "motorista"),
    );

    const hasManagementRole = Boolean(
        user?.super_admin ||
        user?.roles?.some(
            (role) =>
                role.codigo === "admin_empresa" ||
                role.codigo === "funcionario",
        ),
    );

    const motoristaMode = hasMotoristaRole && !hasManagementRole;

    const query = useQuery({
        queryKey: ["registos-criminais", tenant?.id],
        enabled: Boolean(tenant?.id),
        queryFn: async () => {
            const response = await api.get("/api/registos-criminais");

            return response.data.data as RegistoCriminal[];
        },
    });

    const motoristasQuery = useQuery({
        queryKey: ["registos-criminais-motoristas", tenant?.id],
        enabled: Boolean(tenant?.id && !motoristaMode),
        retry: false,
        queryFn: async () => {
            const response = await api.get("/api/motoristas");

            return response.data.data as Motorista[];
        },
    });

    const createMutation = useMutation({
        mutationFn: async (data: FormData) => {
            await api.post("/api/registos-criminais", data);
        },
        onSuccess: async () => {
            setUploadOpen(false);

            await refresh();
        },
    });

    const approveMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.post(`/api/registos-criminais/${id}/validar`);
        },
        onSuccess: async () => {
            await refresh();
        },
    });

    const rejectMutation = useMutation({
        mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => {
            await api.post(`/api/registos-criminais/${id}/rejeitar`, {
                motivo,
            });
        },
        onSuccess: async () => {
            await refresh();
        },
    });

    async function refresh() {
        await queryClient.invalidateQueries({
            queryKey: ["registos-criminais", tenant?.id],
        });
    }

    async function reject(item: RegistoCriminal) {
        const motivo = window.prompt("Indique o motivo da rejeição:");

        if (!motivo || !motivo.trim()) {
            return;
        }

        try {
            await rejectMutation.mutateAsync({
                id: item.id,
                motivo: motivo.trim(),
            });
        } catch (exception) {
            window.alert(apiError(exception));
        }
    }

    async function approve(item: RegistoCriminal) {
        if (
            !window.confirm(
                `Validar o registo criminal de ${item.motorista?.nome_completo ?? "este motorista"}?`,
            )
        ) {
            return;
        }

        try {
            await approveMutation.mutateAsync(item.id);
        } catch (exception) {
            window.alert(apiError(exception));
        }
    }

    const items = useMemo(() => {
        const list = query.data ?? [];

        const term = search.trim().toLocaleLowerCase("pt-PT");

        return list.filter((item) => {
            if (status !== "todos" && item.status !== status) {
                return false;
            }

            if (validade !== "todas" && item.situacao_validade !== validade) {
                return false;
            }

            if (!term) {
                return true;
            }

            return [
                item.motorista?.nome_completo,
                item.motorista?.nif,
                item.codigo_consulta,
                item.arquivo_nome,
            ]
                .filter(Boolean)
                .some((value) =>
                    String(value).toLocaleLowerCase("pt-PT").includes(term),
                );
        });
    }, [query.data, search, status, validade]);

    if (!tenant) {
        return (
            <div className="max-w-7xl mx-auto">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 flex gap-4">
                    <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />

                    <div>
                        <h1 className="font-semibold text-amber-900">
                            Selecione uma organização
                        </h1>

                        <p className="mt-1 text-sm text-amber-700">
                            Selecione uma organização antes de consultar os
                            registos criminais.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const all = query.data ?? [];

    const pending = all.filter(
        (item) => item.status === "pendente_validacao",
    ).length;

    const valid = all.filter(
        (item) =>
            item.status === "validado" && item.situacao_validade === "valido",
    ).length;

    const warning = all.filter(
        (item) =>
            item.status === "validado" &&
            (item.situacao_validade === "a_expirar" ||
                item.situacao_validade === "expirado"),
    ).length;

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <p className="text-sm font-medium text-indigo-600 mb-2">
                        Documentação
                    </p>

                    <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                        {motoristaMode
                            ? "Registo Criminal"
                            : "Registos Criminais"}
                    </h1>

                    <p className="mt-2 text-slate-500">
                        {motoristaMode
                            ? "Envie e acompanhe a validação do seu certificado de registo criminal."
                            : "Validação, histórico e controlo de validade dos registos criminais dos motoristas."}
                    </p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <button
                        type="button"
                        disabled={query.isFetching}
                        onClick={refresh}
                        className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 flex items-center gap-2 disabled:opacity-50"
                    >
                        <RefreshCw
                            className={[
                                "w-4 h-4",
                                query.isFetching ? "animate-spin" : "",
                            ].join(" ")}
                        />
                        Atualizar
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            createMutation.reset();
                            setUploadOpen(true);
                        }}
                        className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />

                        {motoristaMode ? "Enviar documento" : "Novo envio"}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Stat icon={ShieldCheck} label="Total" value={all.length} />

                <Stat icon={FileClock} label="Em validação" value={pending} />

                <Stat icon={FileCheck2} label="Válidos" value={valid} />

                <Stat icon={FileWarning} label="Atenção" value={warning} />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="p-5 border-b border-slate-200">
                    <div className="grid lg:grid-cols-[1fr_190px_190px] gap-3">
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                            <input
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Pesquisar motorista, NIF ou código..."
                                className="w-full h-11 rounded-xl border border-slate-200 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                            />
                        </div>

                        <select
                            value={status}
                            onChange={(event) =>
                                setStatus(event.target.value as StatusFilter)
                            }
                            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500"
                        >
                            <option value="todos">Todos os estados</option>

                            <option value="pendente_validacao">
                                Em validação
                            </option>

                            <option value="validado">Validados</option>

                            <option value="rejeitado">Rejeitados</option>
                        </select>

                        <select
                            value={validade}
                            onChange={(event) =>
                                setValidade(
                                    event.target.value as ValidadeFilter,
                                )
                            }
                            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500"
                        >
                            <option value="todas">Todas as validades</option>

                            <option value="valido">Válidos</option>

                            <option value="a_expirar">A expirar</option>

                            <option value="expirado">Expirados</option>
                        </select>
                    </div>
                </div>

                {query.isLoading ? (
                    <div className="py-20 flex justify-center">
                        <LoaderCircle className="w-8 h-8 animate-spin text-indigo-600" />
                    </div>
                ) : query.isError ? (
                    <div className="py-16 text-center px-6">
                        <AlertCircle className="w-10 h-10 mx-auto text-red-500" />

                        <p className="mt-3 text-slate-700">
                            {apiError(query.error)}
                        </p>
                    </div>
                ) : items.length === 0 ? (
                    <div className="py-20 text-center px-6">
                        <ShieldCheck className="w-11 h-11 mx-auto text-indigo-500" />

                        <h3 className="mt-4 font-semibold text-slate-900">
                            Nenhum registo criminal encontrado
                        </h3>

                        <p className="mt-2 text-sm text-slate-500">
                            Envie um certificado para iniciar o histórico.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-5 py-3 text-xs uppercase text-slate-500">
                                        Motorista
                                    </th>

                                    <th className="px-5 py-3 text-xs uppercase text-slate-500">
                                        Código
                                    </th>

                                    <th className="px-5 py-3 text-xs uppercase text-slate-500">
                                        Validade
                                    </th>

                                    <th className="px-5 py-3 text-xs uppercase text-slate-500">
                                        Validação
                                    </th>

                                    <th className="px-5 py-3 text-xs uppercase text-slate-500">
                                        Documento
                                    </th>

                                    <th className="px-5 py-3 text-xs uppercase text-slate-500 text-right">
                                        Ações
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {items.map((item) => (
                                    <tr
                                        key={item.id}
                                        className="hover:bg-slate-50/70"
                                    >
                                        <td className="px-5 py-4">
                                            <div className="font-medium text-slate-900">
                                                {item.motorista
                                                    ?.nome_completo ??
                                                    "Motorista"}
                                            </div>

                                            <div className="text-xs text-slate-500 mt-1">
                                                {item.motorista?.nif ?? "—"}
                                            </div>
                                        </td>

                                        <td className="px-5 py-4">
                                            <span className="font-mono text-sm text-slate-700">
                                                {item.codigo_consulta ?? "—"}
                                            </span>
                                        </td>

                                        <td className="px-5 py-4">
                                            <div className="text-sm font-medium text-slate-800">
                                                {formatDate(item.data_validade)}
                                            </div>

                                            <div className="mt-1 flex flex-wrap gap-2">
                                                <span
                                                    className={[
                                                        "inline-flex px-2 py-1 rounded-lg text-xs font-medium",
                                                        validadeClass[
                                                            item
                                                                .situacao_validade
                                                        ],
                                                    ].join(" ")}
                                                >
                                                    {
                                                        validadeLabel[
                                                            item
                                                                .situacao_validade
                                                        ]
                                                    }
                                                </span>

                                                <span className="text-xs text-slate-500 self-center">
                                                    {item.dias_restantes >= 0
                                                        ? `${item.dias_restantes} dias`
                                                        : `${Math.abs(item.dias_restantes)} dias vencido`}
                                                </span>
                                            </div>
                                        </td>

                                        <td className="px-5 py-4">
                                            <span
                                                className={[
                                                    "inline-flex px-2.5 py-1 rounded-lg text-xs font-medium",
                                                    statusClass[item.status],
                                                ].join(" ")}
                                            >
                                                {statusLabel[item.status]}
                                            </span>

                                            {item.status === "rejeitado" &&
                                                item.observacoes_empresa && (
                                                    <p className="mt-2 max-w-xs text-xs text-red-600">
                                                        {
                                                            item.observacoes_empresa
                                                        }
                                                    </p>
                                                )}
                                        </td>

                                        <td className="px-5 py-4">
                                            <div className="text-sm text-slate-700 max-w-[180px] truncate">
                                                {item.arquivo_nome}
                                            </div>

                                            <div className="mt-1 text-xs text-slate-400">
                                                {formatBytes(
                                                    item.arquivo_tamanho,
                                                )}
                                            </div>
                                        </td>

                                        <td className="px-5 py-4">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        void openAuthenticatedFile(
                                                            `/api/registos-criminais/${item.id}/arquivo`,
                                                        ).catch((error) =>
                                                            window.alert(
                                                                error instanceof
                                                                    Error
                                                                    ? error.message
                                                                    : apiError(
                                                                          error,
                                                                      ),
                                                            ),
                                                        );
                                                    }}
                                                    title="Visualizar"
                                                    className="w-9 h-9 rounded-lg hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 flex items-center justify-center"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        void downloadAuthenticatedFile(
                                                            `/api/registos-criminais/${item.id}/arquivo/download`,
                                                            item.arquivo_nome,
                                                        ).catch((error) =>
                                                            window.alert(
                                                                error instanceof
                                                                    Error
                                                                    ? error.message
                                                                    : apiError(
                                                                          error,
                                                                      ),
                                                            ),
                                                        );
                                                    }}
                                                    title="Descarregar"
                                                    className="w-9 h-9 rounded-lg hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 flex items-center justify-center"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </button>

                                                {!motoristaMode &&
                                                    item.status ===
                                                        "pendente_validacao" && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                title="Validar"
                                                                disabled={
                                                                    approveMutation.isPending ||
                                                                    rejectMutation.isPending
                                                                }
                                                                onClick={() =>
                                                                    approve(
                                                                        item,
                                                                    )
                                                                }
                                                                className="w-9 h-9 rounded-lg hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 flex items-center justify-center disabled:opacity-50"
                                                            >
                                                                <CheckCircle2 className="w-4 h-4" />
                                                            </button>

                                                            <button
                                                                type="button"
                                                                title="Rejeitar"
                                                                disabled={
                                                                    approveMutation.isPending ||
                                                                    rejectMutation.isPending
                                                                }
                                                                onClick={() =>
                                                                    reject(item)
                                                                }
                                                                className="w-9 h-9 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600 flex items-center justify-center disabled:opacity-50"
                                                            >
                                                                <XCircle className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <RegistoCriminalUploadModal
                key={uploadOpen ? "open" : "closed"}
                open={uploadOpen}
                motoristaMode={motoristaMode}
                motoristas={motoristasQuery.data ?? []}
                saving={createMutation.isPending}
                error={createMutation.error}
                onClose={() => {
                    if (!createMutation.isPending) {
                        createMutation.reset();
                        setUploadOpen(false);
                    }
                }}
                onSubmit={async (formData) => {
                    await createMutation.mutateAsync(formData);
                }}
            />
        </div>
    );
}

function Stat({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof ShieldCheck;
    label: string;
    value: number;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-sm text-slate-500">{label}</p>

                    <p className="mt-2 text-2xl font-bold text-slate-950">
                        {value}
                    </p>
                </div>

                <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                </div>
            </div>
        </div>
    );
}
