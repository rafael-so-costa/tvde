import axios from "axios";
import {
    AlertCircle,
    CheckCircle2,
    Download,
    Eye,
    FileClock,
    FileText,
    LoaderCircle,
    Plus,
    ReceiptText,
    RefreshCw,
    Search,
    TriangleAlert,
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
import ReciboVerdeUploadModal from "../components/recibos-verdes/ReciboVerdeUploadModal";
import type { Motorista } from "../types/motorista";
import type { ReciboVerde, ReciboVerdeStatus } from "../types/recibo-verde";

type StatusFilter = "todos" | ReciboVerdeStatus;

const statusLabel: Record<ReciboVerdeStatus, string> = {
    pendente_validacao: "Em validação",
    validado: "Validado",
    rejeitado: "Rejeitado",
};

const statusClass: Record<ReciboVerdeStatus, string> = {
    pendente_validacao: "bg-amber-50 text-amber-700",
    validado: "bg-emerald-50 text-emerald-700",
    rejeitado: "bg-red-50 text-red-700",
};

const monthNames = [
    "",
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
];

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

    const raw = value.slice(0, 10);

    const parts = raw.split("-");

    if (parts.length !== 3) {
        return value;
    }

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function money(value: string | number): string {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "€ 0,00";
    }

    return new Intl.NumberFormat("pt-PT", {
        style: "currency",
        currency: "EUR",
    }).format(number);
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

export default function RecibosVerdesPage() {
    const { user } = useAuth();

    const { tenant } = useTenant();

    const queryClient = useQueryClient();

    const [uploadOpen, setUploadOpen] = useState(false);

    const [search, setSearch] = useState("");

    const [status, setStatus] = useState<StatusFilter>("todos");

    const [year, setYear] = useState("todos");

    const [month, setMonth] = useState("todos");

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

    const receiptsQuery = useQuery({
        queryKey: ["recibos-verdes", tenant?.id],

        enabled: Boolean(tenant?.id),

        queryFn: async () => {
            const response = await api.get("/api/recibos-verdes");

            return response.data.data as ReciboVerde[];
        },
    });

    const motoristasQuery = useQuery({
        queryKey: ["recibos-verdes-motoristas", tenant?.id],

        enabled: Boolean(tenant?.id && !motoristaMode),

        retry: false,

        queryFn: async () => {
            const response = await api.get("/api/motoristas");

            return response.data.data as Motorista[];
        },
    });

    const createMutation = useMutation({
        mutationFn: async (formData: FormData) => {
            const response = await api.post("/api/recibos-verdes", formData);

            return response.data.data as ReciboVerde;
        },

        onSuccess: async () => {
            setUploadOpen(false);

            await refresh();
        },
    });

    const approveMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.post(`/api/recibos-verdes/${id}/validar`);
        },

        onSuccess: async () => {
            await refresh();
        },
    });

    const rejectMutation = useMutation({
        mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => {
            await api.post(`/api/recibos-verdes/${id}/rejeitar`, {
                motivo,
            });
        },

        onSuccess: async () => {
            await refresh();
        },
    });

    async function refresh() {
        await queryClient.invalidateQueries({
            queryKey: ["recibos-verdes", tenant?.id],
        });
    }

    async function approve(recibo: ReciboVerde) {
        if (!window.confirm(`Validar o recibo ${recibo.numero_documento}?`)) {
            return;
        }

        try {
            await approveMutation.mutateAsync(recibo.id);
        } catch (exception) {
            window.alert(apiError(exception));
        }
    }

    async function reject(recibo: ReciboVerde) {
        const motivo = window.prompt("Indique o motivo da rejeição:");

        if (!motivo?.trim()) {
            return;
        }

        try {
            await rejectMutation.mutateAsync({
                id: recibo.id,
                motivo: motivo.trim(),
            });
        } catch (exception) {
            window.alert(apiError(exception));
        }
    }

    const years = useMemo(() => {
        const values = new Set<number>();

        (receiptsQuery.data ?? []).forEach((item) => values.add(item.ano));

        values.add(new Date().getFullYear());

        return Array.from(values).sort((a, b) => b - a);
    }, [receiptsQuery.data]);

    const receipts = useMemo(() => {
        const term = search.trim().toLocaleLowerCase("pt-PT");

        return (receiptsQuery.data ?? []).filter((item) => {
            if (status !== "todos" && item.status !== status) {
                return false;
            }

            if (year !== "todos" && item.ano !== Number(year)) {
                return false;
            }

            if (month !== "todos" && item.mes !== Number(month)) {
                return false;
            }

            if (!term) {
                return true;
            }

            return [
                item.numero_documento,
                item.motorista?.nome_completo,
                item.motorista?.nif,
                item.empresa?.nome_empresa,
                item.nif_emitente,
                item.nif_adquirente,
                item.nome_emitente,
                item.nome_adquirente,
            ]
                .filter(Boolean)
                .some((value) =>
                    String(value).toLocaleLowerCase("pt-PT").includes(term),
                );
        });
    }, [receiptsQuery.data, search, status, year, month]);

    if (!tenant) {
        return (
            <div className="max-w-7xl mx-auto">
                <div className="p-6 rounded-2xl border border-amber-200 bg-amber-50 flex gap-4">
                    <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />

                    <div>
                        <h1 className="font-semibold text-amber-900">
                            Selecione uma organização
                        </h1>

                        <p className="mt-1 text-sm text-amber-700">
                            Selecione uma organização antes de consultar recibos
                            verdes.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const all = receiptsQuery.data ?? [];

    const pending = all.filter(
        (item) => item.status === "pendente_validacao",
    ).length;

    const validated = all.filter((item) => item.status === "validado");

    const withWarnings = all.filter(
        (item) => (item.avisos_validacao ?? []).length > 0,
    ).length;

    const validatedTotal = validated.reduce(
        (total, item) => total + Number(item.valor_total),
        0,
    );

    return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <p className="mb-2 text-sm font-medium text-indigo-600">
                        Financeiro
                    </p>

                    <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                        Recibos Verdes
                    </h1>

                    <p className="mt-2 text-slate-500">
                        {motoristaMode
                            ? "Envie as suas faturas-recibo e acompanhe a validação."
                            : "Receção, conferência e validação das faturas-recibo dos motoristas."}
                    </p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <button
                        type="button"
                        disabled={receiptsQuery.isFetching}
                        onClick={refresh}
                        className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 flex items-center gap-2 disabled:opacity-50"
                    >
                        <RefreshCw
                            className={[
                                "w-4 h-4",
                                receiptsQuery.isFetching ? "animate-spin" : "",
                            ].join(" ")}
                        />
                        Atualizar
                    </button>

                    <button
                        type="button"
                        onClick={() => setUploadOpen(true)}
                        className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />

                        {motoristaMode ? "Enviar recibo" : "Novo recibo"}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Stat
                    icon={ReceiptText}
                    label="Total"
                    value={String(all.length)}
                />

                <Stat
                    icon={FileClock}
                    label="Em validação"
                    value={String(pending)}
                />

                <Stat
                    icon={TriangleAlert}
                    label="Com avisos"
                    value={String(withWarnings)}
                />

                <Stat
                    icon={CheckCircle2}
                    label="Total validado"
                    value={money(validatedTotal)}
                />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="p-5 border-b border-slate-200">
                    <div className="grid lg:grid-cols-[1fr_180px_145px_165px] gap-3">
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                            <input
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Motorista, NIF, documento ou empresa..."
                                className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                            />
                        </div>

                        <select
                            value={status}
                            onChange={(event) =>
                                setStatus(event.target.value as StatusFilter)
                            }
                            className="h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm"
                        >
                            <option value="todos">Todos os estados</option>

                            <option value="pendente_validacao">
                                Em validação
                            </option>

                            <option value="validado">Validados</option>

                            <option value="rejeitado">Rejeitados</option>
                        </select>

                        <select
                            value={year}
                            onChange={(event) => setYear(event.target.value)}
                            className="h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm"
                        >
                            <option value="todos">Todos os anos</option>

                            {years.map((item) => (
                                <option key={item} value={item}>
                                    {item}
                                </option>
                            ))}
                        </select>

                        <select
                            value={month}
                            onChange={(event) => setMonth(event.target.value)}
                            className="h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm"
                        >
                            <option value="todos">Todos os meses</option>

                            {monthNames.slice(1).map((name, index) => (
                                <option key={index + 1} value={index + 1}>
                                    {name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {receiptsQuery.isLoading ? (
                    <div className="py-20 flex justify-center">
                        <LoaderCircle className="w-8 h-8 animate-spin text-indigo-600" />
                    </div>
                ) : receiptsQuery.isError ? (
                    <div className="py-16 px-6 text-center">
                        <AlertCircle className="w-10 h-10 mx-auto text-red-500" />

                        <p className="mt-3 text-slate-700">
                            {apiError(receiptsQuery.error)}
                        </p>
                    </div>
                ) : receipts.length === 0 ? (
                    <div className="py-20 px-6 text-center">
                        <ReceiptText className="w-11 h-11 mx-auto text-indigo-500" />

                        <h3 className="mt-4 font-semibold text-slate-900">
                            Nenhum recibo encontrado
                        </h3>

                        <p className="mt-2 text-sm text-slate-500">
                            Envie uma fatura-recibo para iniciar o histórico.
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
                                        Documento
                                    </th>

                                    <th className="px-5 py-3 text-xs uppercase text-slate-500">
                                        Período
                                    </th>

                                    <th className="px-5 py-3 text-xs uppercase text-slate-500">
                                        Empresa
                                    </th>

                                    <th className="px-5 py-3 text-xs uppercase text-slate-500">
                                        Valor
                                    </th>

                                    <th className="px-5 py-3 text-xs uppercase text-slate-500">
                                        Estado
                                    </th>

                                    <th className="px-5 py-3 text-xs uppercase text-slate-500 text-right">
                                        Ações
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {receipts.map((item) => (
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

                                            <div className="mt-1 text-xs text-slate-500">
                                                {item.nif_emitente}
                                            </div>
                                        </td>

                                        <td className="px-5 py-4">
                                            <div className="text-sm font-medium text-slate-800">
                                                {item.numero_documento}
                                            </div>

                                            <div className="mt-1 text-xs text-slate-500">
                                                {formatDate(item.data_emissao)}
                                            </div>

                                            <div className="mt-1 text-xs text-slate-400">
                                                {formatBytes(
                                                    item.arquivo_tamanho,
                                                )}
                                            </div>
                                        </td>

                                        <td className="px-5 py-4 text-sm text-slate-700">
                                            {monthNames[item.mes]} {item.ano}
                                        </td>

                                        <td className="px-5 py-4">
                                            <div className="text-sm text-slate-700">
                                                {item.empresa?.nome_empresa ??
                                                    item.nome_adquirente ??
                                                    "Não identificada"}
                                            </div>

                                            <div className="mt-1 text-xs text-slate-500">
                                                {item.nif_adquirente}
                                            </div>
                                        </td>

                                        <td className="px-5 py-4">
                                            <div className="font-semibold text-slate-900">
                                                {money(item.valor_total)}
                                            </div>

                                            <div className="mt-1 text-xs text-slate-500">
                                                Base {money(item.valor_base)}
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

                                            {(item.avisos_validacao ?? [])
                                                .length > 0 && (
                                                <div className="mt-2">
                                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                                                        <TriangleAlert className="w-3.5 h-3.5" />
                                                        {
                                                            (
                                                                item.avisos_validacao ??
                                                                []
                                                            ).length
                                                        }{" "}
                                                        aviso(s)
                                                    </span>

                                                    <div className="mt-1 max-w-xs space-y-1">
                                                        {(
                                                            item.avisos_validacao ??
                                                            []
                                                        ).map(
                                                            (
                                                                warning,
                                                                index,
                                                            ) => (
                                                                <p
                                                                    key={`${warning.codigo}-${index}`}
                                                                    className="text-xs text-amber-700"
                                                                >
                                                                    {
                                                                        warning.mensagem
                                                                    }
                                                                </p>
                                                            ),
                                                        )}
                                                    </div>
                                                </div>
                                            )}

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
                                            <div className="flex justify-end items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        void openAuthenticatedFile(
                                                            `/api/recibos-verdes/${item.id}/arquivo`,
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
                                                            `/api/recibos-verdes/${item.id}/arquivo/download`,
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

            <ReciboVerdeUploadModal
                key={uploadOpen ? "open" : "closed"}
                open={uploadOpen}
                motoristaMode={motoristaMode}
                motoristas={motoristasQuery.data ?? []}
                saving={createMutation.isPending}
                error={createMutation.error}
                onClose={() => {
                    if (!createMutation.isPending) {
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
    icon: typeof ReceiptText | typeof FileText;
    label: string;
    value: string;
}) {
    return (
        <div className="p-5 rounded-2xl border border-slate-200 bg-white">
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
