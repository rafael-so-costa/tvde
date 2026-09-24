import axios from "axios";
import {
    AlertCircle,
    Ban,
    CalendarClock,
    CalendarDays,
    Car,
    CheckCircle2,
    Eye,
    LoaderCircle,
    PauseCircle,
    Pencil,
    Play,
    Plus,
    RefreshCw,
    RotateCcw,
    Search,
    Trash2,
    UserRound,
    Wrench,
    X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../lib/api";
import { useTenant } from "../../contexts/TenantContext";
import ManutencaoFormModal from "./ManutencaoFormModal";
import ItensManutencaoSection from "./ItensManutencaoSection";
import AprovacoesManutencaoSection from "./AprovacoesManutencaoSection";
import DocumentosManutencaoSection from "./DocumentosManutencaoSection";
import GarantiasManutencaoSection from "./GarantiasManutencaoSection";
import type {
    Manutencao,
    ManutencaoDetailResponse,
    ManutencaoListResponse,
    ManutencaoOrigem,
    ManutencaoPrioridade,
    ManutencaoStatus,
} from "../../types/manutencao";

type StatusFilter = "todos" | ManutencaoStatus;
type PrioridadeFilter = "todas" | ManutencaoPrioridade;
type OrigemFilter = "todas" | ManutencaoOrigem;

type WorkflowAction =
    | "agendar"
    | "iniciar"
    | "aguardar-pecas"
    | "retomar"
    | "concluir"
    | "cancelar";

const statusLabels: Record<ManutencaoStatus, string> = {
    rascunho: "Rascunho",
    aguardando_aprovacao: "Aguardando aprovação",
    aprovada: "Aprovada",
    agendada: "Agendada",
    em_andamento: "Em andamento",
    aguardando_pecas: "Aguardando peças",
    concluida: "Concluída",
    cancelada: "Cancelada",
};

const statusClasses: Record<ManutencaoStatus, string> = {
    rascunho: "bg-slate-100 text-slate-700",
    aguardando_aprovacao: "bg-amber-50 text-amber-700",
    aprovada: "bg-emerald-50 text-emerald-700",
    agendada: "bg-blue-50 text-blue-700",
    em_andamento: "bg-indigo-50 text-indigo-700",
    aguardando_pecas: "bg-orange-50 text-orange-700",
    concluida: "bg-emerald-50 text-emerald-700",
    cancelada: "bg-red-50 text-red-700",
};

const prioridadeLabels: Record<ManutencaoPrioridade, string> = {
    baixa: "Baixa",
    normal: "Normal",
    alta: "Alta",
    critica: "Crítica",
};

const prioridadeClasses: Record<ManutencaoPrioridade, string> = {
    baixa: "bg-slate-100 text-slate-600",
    normal: "bg-blue-50 text-blue-700",
    alta: "bg-orange-50 text-orange-700",
    critica: "bg-red-50 text-red-700",
};

const origemLabels: Record<ManutencaoOrigem, string> = {
    preventiva: "Preventiva",
    avaria: "Avaria",
    checklist: "Checklist",
    sinistro: "Sinistro",
    diagnostico: "Diagnóstico",
    manual: "Manual",
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

function money(value: number | string | null | undefined): string {
    const number = Number(value ?? 0);

    return new Intl.NumberFormat("pt-PT", {
        style: "currency",
        currency: "EUR",
    }).format(Number.isFinite(number) ? number : 0);
}

function formatDate(value: string | null | undefined): string {
    if (!value) {
        return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat("pt-PT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(date);
}

function tomorrow(): string {
    const date = new Date();

    date.setDate(date.getDate() + 1);

    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 10);
}

export default function OrdensTab() {
    const { tenant } = useTenant();
    const queryClient = useQueryClient();

    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<StatusFilter>("todos");
    const [prioridade, setPrioridade] = useState<PrioridadeFilter>("todas");
    const [origem, setOrigem] = useState<OrigemFilter>("todas");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<Manutencao | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    const listQuery = useQuery({
        queryKey: ["manutencoes", tenant?.id],
        enabled: Boolean(tenant?.id),
        queryFn: async () => {
            const response =
                await api.get<ManutencaoListResponse>("/api/manutencoes");

            return response.data.data;
        },
    });

    const detailQuery = useQuery({
        queryKey: ["manutencao", tenant?.id, selectedId],
        enabled: Boolean(tenant?.id && selectedId),
        queryFn: async () => {
            const response = await api.get<ManutencaoDetailResponse>(
                `/api/manutencoes/${selectedId}`,
            );

            return response.data.data;
        },
    });

    async function refresh(id?: string | null) {
        await queryClient.invalidateQueries({
            queryKey: ["manutencoes", tenant?.id],
        });

        if (id) {
            await queryClient.invalidateQueries({
                queryKey: ["manutencao", tenant?.id, id],
            });
        }
    }

    const workflowMutation = useMutation({
        mutationFn: async ({
            manutencao,
            action,
        }: {
            manutencao: Manutencao;
            action: WorkflowAction;
        }) => {
            let payload: Record<string, unknown> = {};

            if (action === "agendar") {
                const value = window.prompt(
                    "Data para agendar a manutenção (AAAA-MM-DD):",
                    manutencao.data_agendada?.slice(0, 10) ?? tomorrow(),
                );

                if (!value) {
                    throw new Error("__cancelled__");
                }

                payload = {
                    data_agendada: value,
                };
            }

            if (action === "cancelar") {
                const motivo = window.prompt("Motivo do cancelamento:", "");

                if (motivo === null) {
                    throw new Error("__cancelled__");
                }

                payload = {
                    motivo: motivo.trim() || null,
                };
            }

            if (
                action === "iniciar" &&
                !window.confirm("Iniciar esta manutenção?")
            ) {
                throw new Error("__cancelled__");
            }

            if (
                action === "aguardar-pecas" &&
                !window.confirm("Marcar esta manutenção como aguardando peças?")
            ) {
                throw new Error("__cancelled__");
            }

            if (
                action === "retomar" &&
                !window.confirm("Retomar esta manutenção?")
            ) {
                throw new Error("__cancelled__");
            }

            if (
                action === "concluir" &&
                !window.confirm(
                    "Concluir esta manutenção? Esta ação pode movimentar estoque e atualizar a quilometragem do veículo.",
                )
            ) {
                throw new Error("__cancelled__");
            }

            const response = await api.post(
                `/api/manutencoes/${manutencao.id}/${action}`,
                payload,
            );

            return response.data.data as Manutencao;
        },
        onMutate: () => {
            setActionError(null);
        },
        onSuccess: async (manutencao) => {
            await refresh(manutencao.id);
        },
        onError: (error) => {
            if (error instanceof Error && error.message === "__cancelled__") {
                return;
            }

            setActionError(apiError(error));
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (manutencao: Manutencao) => {
            if (
                !window.confirm(`Eliminar a ordem ${manutencao.numero_ordem}?`)
            ) {
                throw new Error("__cancelled__");
            }

            await api.delete(`/api/manutencoes/${manutencao.id}`);

            return manutencao;
        },
        onMutate: () => {
            setActionError(null);
        },
        onSuccess: async () => {
            setSelectedId(null);
            await refresh();
        },
        onError: (error) => {
            if (error instanceof Error && error.message === "__cancelled__") {
                return;
            }

            setActionError(apiError(error));
        },
    });

    async function saved(manutencao: Manutencao) {
        setFormOpen(false);
        setEditing(null);
        setSelectedId(manutencao.id);
        await refresh(manutencao.id);
    }

    const manutencoes = listQuery.data ?? [];

    const filtered = useMemo(() => {
        const term = search.trim().toLocaleLowerCase("pt-PT");

        return manutencoes.filter((item) => {
            if (status !== "todos" && item.status !== status) {
                return false;
            }

            if (prioridade !== "todas" && item.prioridade !== prioridade) {
                return false;
            }

            if (origem !== "todas" && item.origem !== origem) {
                return false;
            }

            if (!term) {
                return true;
            }

            return [
                item.numero_ordem,
                item.tipo_servico,
                item.problema_reportado,
                item.veiculo?.matricula,
                item.veiculo?.marca,
                item.veiculo?.modelo,
                item.motorista?.nome_completo,
                item.fornecedor?.nome,
            ]
                .filter(Boolean)
                .join(" ")
                .toLocaleLowerCase("pt-PT")
                .includes(term);
        });
    }, [manutencoes, search, status, prioridade, origem]);

    const stats = useMemo(
        () => ({
            total: manutencoes.length,

            abertas: manutencoes.filter(
                (item) => !["concluida", "cancelada"].includes(item.status),
            ).length,

            andamento: manutencoes.filter(
                (item) =>
                    item.status === "em_andamento" ||
                    item.status === "aguardando_pecas",
            ).length,

            criticas: manutencoes.filter(
                (item) =>
                    item.prioridade === "critica" &&
                    !["concluida", "cancelada"].includes(item.status),
            ).length,
        }),
        [manutencoes],
    );

    const selected = detailQuery.data ?? null;

    return (
        <div className="space-y-5">
            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={() => {
                        setEditing(null);
                        setFormOpen(true);
                    }}
                    className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                >
                    <Plus className="w-5 h-5" />
                    Nova ordem
                </button>
            </div>

            {actionError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />

                    <p className="text-sm text-red-700">{actionError}</p>
                </div>
            )}

            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <Stat
                    label="Total de ordens"
                    value={String(stats.total)}
                    icon={Wrench}
                />

                <Stat
                    label="Ordens abertas"
                    value={String(stats.abertas)}
                    icon={AlertCircle}
                />

                <Stat
                    label="Em execução"
                    value={String(stats.andamento)}
                    icon={RefreshCw}
                />

                <Stat
                    label="Prioridade crítica"
                    value={String(stats.criticas)}
                    icon={AlertCircle}
                />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="grid gap-3 lg:grid-cols-[1fr_190px_170px_170px_auto]">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Pesquisar ordem, veículo, serviço..."
                            className="w-full h-11 rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
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

                        {Object.entries(statusLabels).map(([value, label]) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </select>

                    <select
                        value={prioridade}
                        onChange={(event) =>
                            setPrioridade(
                                event.target.value as PrioridadeFilter,
                            )
                        }
                        className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500"
                    >
                        <option value="todas">Prioridades</option>

                        {Object.entries(prioridadeLabels).map(
                            ([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ),
                        )}
                    </select>

                    <select
                        value={origem}
                        onChange={(event) =>
                            setOrigem(event.target.value as OrigemFilter)
                        }
                        className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500"
                    >
                        <option value="todas">Origens</option>

                        {Object.entries(origemLabels).map(([value, label]) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </select>

                    <button
                        type="button"
                        onClick={() => listQuery.refetch()}
                        disabled={listQuery.isFetching}
                        className="h-11 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 flex items-center justify-center gap-2 hover:bg-slate-50 disabled:opacity-50"
                    >
                        <RefreshCw
                            className={[
                                "w-4 h-4",
                                listQuery.isFetching ? "animate-spin" : "",
                            ].join(" ")}
                        />
                        Atualizar
                    </button>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                {listQuery.isLoading ? (
                    <div className="py-20 flex justify-center">
                        <LoaderCircle className="w-8 h-8 animate-spin text-indigo-600" />
                    </div>
                ) : listQuery.isError ? (
                    <div className="p-8 text-center">
                        <AlertCircle className="mx-auto w-8 h-8 text-red-500" />

                        <p className="mt-3 font-semibold text-slate-900">
                            Não foi possível carregar as ordens.
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                            {apiError(listQuery.error)}
                        </p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-16 text-center">
                        <Wrench className="mx-auto w-10 h-10 text-slate-300" />

                        <p className="mt-3 font-semibold text-slate-700">
                            Nenhuma ordem encontrada.
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                            Ajuste os filtros ou registe uma nova manutenção.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[980px]">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <Th>Ordem</Th>
                                    <Th>Veículo</Th>
                                    <Th>Serviço</Th>
                                    <Th>Origem</Th>
                                    <Th>Prioridade</Th>
                                    <Th>Estado</Th>
                                    <Th>Custo</Th>
                                    <Th>Data</Th>
                                    <th className="w-16" />
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {filtered.map((item) => (
                                    <tr
                                        key={item.id}
                                        className="hover:bg-slate-50/70"
                                    >
                                        <td className="px-5 py-4">
                                            <p className="font-semibold text-slate-900">
                                                {item.numero_ordem}
                                            </p>

                                            <p className="mt-1 text-xs text-slate-500">
                                                {item.motorista
                                                    ?.nome_completo ??
                                                    "Sem motorista"}
                                            </p>
                                        </td>

                                        <td className="px-5 py-4">
                                            <p className="font-medium text-slate-900">
                                                {item.veiculo?.matricula ?? "—"}
                                            </p>

                                            <p className="text-xs text-slate-500">
                                                {[
                                                    item.veiculo?.marca,
                                                    item.veiculo?.modelo,
                                                ]
                                                    .filter(Boolean)
                                                    .join(" ") || "—"}
                                            </p>
                                        </td>

                                        <td className="px-5 py-4 text-sm text-slate-700">
                                            {item.tipo_servico}
                                        </td>

                                        <td className="px-5 py-4 text-sm text-slate-600">
                                            {origemLabels[item.origem]}
                                        </td>

                                        <td className="px-5 py-4">
                                            <span
                                                className={[
                                                    "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                                                    prioridadeClasses[
                                                        item.prioridade
                                                    ],
                                                ].join(" ")}
                                            >
                                                {
                                                    prioridadeLabels[
                                                        item.prioridade
                                                    ]
                                                }
                                            </span>
                                        </td>

                                        <td className="px-5 py-4">
                                            <span
                                                className={[
                                                    "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                                                    statusClasses[item.status],
                                                ].join(" ")}
                                            >
                                                {statusLabels[item.status]}
                                            </span>
                                        </td>

                                        <td className="px-5 py-4 text-sm font-semibold text-slate-900">
                                            {money(item.custo_total)}
                                        </td>

                                        <td className="px-5 py-4 text-sm text-slate-600">
                                            {formatDate(item.data_solicitacao)}
                                        </td>

                                        <td className="px-5 py-4">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setActionError(null);
                                                    setSelectedId(item.id);
                                                }}
                                                className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-200"
                                                title="Ver detalhes"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {selectedId && (
                <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm p-4 flex items-center justify-center">
                    <div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
                        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-5 flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-bold text-slate-950">
                                    Ordem de manutenção
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    {selected?.numero_ordem ?? "A carregar..."}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setSelectedId(null)}
                                className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {detailQuery.isLoading ? (
                            <div className="py-24 flex justify-center">
                                <LoaderCircle className="w-8 h-8 animate-spin text-indigo-600" />
                            </div>
                        ) : detailQuery.isError || !selected ? (
                            <div className="p-10 text-center">
                                <AlertCircle className="mx-auto w-8 h-8 text-red-500" />

                                <p className="mt-3 font-semibold text-slate-900">
                                    Não foi possível carregar a ordem.
                                </p>

                                <p className="mt-1 text-sm text-slate-500">
                                    {apiError(detailQuery.error)}
                                </p>
                            </div>
                        ) : (
                            <OrderDetail
                                manutencao={selected}
                                busy={
                                    workflowMutation.isPending ||
                                    deleteMutation.isPending
                                }
                                actionError={actionError}
                                onEdit={() => {
                                    setEditing(selected);
                                    setFormOpen(true);
                                }}
                                onDelete={() => deleteMutation.mutate(selected)}
                                onWorkflow={(action) =>
                                    workflowMutation.mutate({
                                        manutencao: selected,
                                        action,
                                    })
                                }
                                onRefresh={async () => {
                                    await refresh(selected.id);
                                }}
                            />
                        )}
                    </div>
                </div>
            )}

            {formOpen && (
                <ManutencaoFormModal
                    editing={editing}
                    onClose={() => {
                        setFormOpen(false);
                        setEditing(null);
                    }}
                    onSaved={saved}
                />
            )}
        </div>
    );
}

function OrderDetail({
    manutencao,
    busy,
    actionError,
    onEdit,
    onDelete,
    onWorkflow,
    onRefresh,
}: {
    manutencao: Manutencao;
    busy: boolean;
    actionError: string | null;
    onEdit: () => void;
    onDelete: () => void;
    onWorkflow: (action: WorkflowAction) => void;
    onRefresh: () => Promise<void> | void;
}) {
    const canEdit = manutencao.status === "rascunho";

    const canSchedule =
        (manutencao.status === "rascunho" &&
            !manutencao.aprovacao_obrigatoria) ||
        manutencao.status === "aprovada";

    const canStart =
        (manutencao.status === "rascunho" &&
            !manutencao.aprovacao_obrigatoria) ||
        manutencao.status === "aprovada" ||
        manutencao.status === "agendada";

    const canWaitParts = manutencao.status === "em_andamento";

    const canResume = manutencao.status === "aguardando_pecas";

    const canComplete = ["em_andamento", "aguardando_pecas"].includes(
        manutencao.status,
    );

    const canCancel = !["concluida", "cancelada"].includes(manutencao.status);

    return (
        <div className="p-6 space-y-6">
            {actionError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />

                    <p className="text-sm text-red-700">{actionError}</p>
                </div>
            )}

            <div className="flex flex-wrap gap-2">
                {canEdit && (
                    <ActionButton
                        icon={Pencil}
                        label="Editar"
                        disabled={busy}
                        onClick={onEdit}
                    />
                )}

                {canSchedule && (
                    <ActionButton
                        icon={CalendarClock}
                        label="Agendar"
                        disabled={busy}
                        onClick={() => onWorkflow("agendar")}
                    />
                )}

                {canStart && (
                    <ActionButton
                        icon={Play}
                        label="Iniciar"
                        disabled={busy}
                        onClick={() => onWorkflow("iniciar")}
                    />
                )}

                {canWaitParts && (
                    <ActionButton
                        icon={PauseCircle}
                        label="Aguardar peças"
                        disabled={busy}
                        onClick={() => onWorkflow("aguardar-pecas")}
                    />
                )}

                {canResume && (
                    <ActionButton
                        icon={RotateCcw}
                        label="Retomar"
                        disabled={busy}
                        onClick={() => onWorkflow("retomar")}
                    />
                )}

                {canComplete && (
                    <ActionButton
                        icon={CheckCircle2}
                        label="Concluir"
                        disabled={busy}
                        onClick={() => onWorkflow("concluir")}
                    />
                )}

                {canCancel && (
                    <ActionButton
                        icon={Ban}
                        label="Cancelar"
                        disabled={busy}
                        onClick={() => onWorkflow("cancelar")}
                    />
                )}

                {canEdit && (
                    <button
                        type="button"
                        disabled={busy}
                        onClick={onDelete}
                        className="h-10 px-4 rounded-xl border border-red-200 text-red-600 text-sm font-semibold flex items-center gap-2 hover:bg-red-50 disabled:opacity-50"
                    >
                        <Trash2 className="w-4 h-4" />
                        Eliminar
                    </button>
                )}
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Info label="Estado" value={statusLabels[manutencao.status]} />

                <Info
                    label="Prioridade"
                    value={prioridadeLabels[manutencao.prioridade]}
                />

                <Info label="Origem" value={origemLabels[manutencao.origem]} />

                <Info
                    label="Custo total"
                    value={money(manutencao.custo_total)}
                />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-xl bg-slate-50 p-4 flex gap-3">
                    <Car className="w-5 h-5 text-indigo-600 shrink-0" />

                    <div>
                        <p className="text-xs text-slate-500">Veículo</p>

                        <p className="mt-1 font-semibold text-slate-900">
                            {manutencao.veiculo?.matricula ?? "—"}
                        </p>

                        <p className="text-sm text-slate-500">
                            {[
                                manutencao.veiculo?.marca,
                                manutencao.veiculo?.modelo,
                            ]
                                .filter(Boolean)
                                .join(" ") || "—"}
                        </p>
                    </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-4 flex gap-3">
                    <UserRound className="w-5 h-5 text-indigo-600 shrink-0" />

                    <div>
                        <p className="text-xs text-slate-500">Motorista</p>

                        <p className="mt-1 font-semibold text-slate-900">
                            {manutencao.motorista?.nome_completo ??
                                "Não associado"}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Info
                    label="Solicitação"
                    value={formatDate(manutencao.data_solicitacao)}
                />

                <Info
                    label="Agendada"
                    value={formatDate(manutencao.data_agendada)}
                />

                <Info
                    label="Entrada"
                    value={formatDate(manutencao.data_entrada)}
                />

                <Info
                    label="Conclusão"
                    value={formatDate(manutencao.data_conclusao)}
                />
            </div>

            <div className="rounded-xl border border-slate-200 p-5">
                <h3 className="font-semibold text-slate-900">Serviço</h3>

                <p className="mt-2 text-sm font-medium text-slate-800">
                    {manutencao.tipo_servico}
                </p>

                {manutencao.problema_reportado && (
                    <p className="mt-3 text-sm text-slate-600 whitespace-pre-wrap">
                        {manutencao.problema_reportado}
                    </p>
                )}

                {manutencao.observacoes && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Observações
                        </p>

                        <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">
                            {manutencao.observacoes}
                        </p>
                    </div>
                )}
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Info label="Peças" value={money(manutencao.custo_pecas)} />

                <Info
                    label="Mão de obra"
                    value={money(manutencao.custo_mao_obra)}
                />

                <Info label="Outros" value={money(manutencao.custo_outros)} />

                <Info
                    label="Orçamento"
                    value={
                        manutencao.valor_orcamento === null
                            ? "—"
                            : money(manutencao.valor_orcamento)
                    }
                />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
                <Info
                    label="Aprovação obrigatória"
                    value={manutencao.aprovacao_obrigatoria ? "Sim" : "Não"}
                />

                <Info
                    label="Indisponibiliza veículo"
                    value={manutencao.indisponibiliza_veiculo ? "Sim" : "Não"}
                />
            </div>

            <ItensManutencaoSection
                manutencao={manutencao}
                editable={
                    manutencao.status !== "concluida" &&
                    manutencao.status !== "cancelada"
                }
                onChanged={async () => {
                    await onRefresh();
                }}
            />

            <AprovacoesManutencaoSection
                manutencaoId={manutencao.id}
                numeroOrdem={manutencao.numero_ordem}
                status={manutencao.status}
                aprovacaoObrigatoria={manutencao.aprovacao_obrigatoria}
                valorOrcamento={manutencao.valor_orcamento}
            />

            <DocumentosManutencaoSection
                manutencao={manutencao}
                onChanged={async () => {
                    await onRefresh();
                }}
            />

            <GarantiasManutencaoSection
                manutencao={manutencao}
                onChanged={async () => {
                    await onRefresh();
                }}
            />

            <div className="grid sm:grid-cols-3 gap-4">
                <div className="rounded-xl bg-slate-50 p-4 flex items-center gap-3">
                    <CalendarDays className="w-5 h-5 text-indigo-600" />

                    <div>
                        <p className="text-xs text-slate-500">Quilometragem</p>

                        <p className="font-semibold text-slate-900">
                            {manutencao.km === null
                                ? "Não registada"
                                : `${Number(manutencao.km).toLocaleString(
                                      "pt-PT",
                                  )} km`}
                        </p>
                    </div>
                </div>

                <Info
                    label="Próxima revisão"
                    value={
                        manutencao.proxima_revisao_km === null
                            ? "—"
                            : `${Number(
                                  manutencao.proxima_revisao_km,
                              ).toLocaleString("pt-PT")} km`
                    }
                />

                <Info
                    label="Data próxima revisão"
                    value={formatDate(manutencao.proxima_revisao_data)}
                />
            </div>
        </div>
    );
}

function ActionButton({
    icon: Icon,
    label,
    disabled,
    onClick,
}: {
    icon: typeof Wrench;
    label: string;
    disabled: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className="h-10 px-4 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold flex items-center gap-2 hover:bg-slate-50 disabled:opacity-50"
        >
            <Icon className="w-4 h-4" />
            {label}
        </button>
    );
}

function Stat({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof Wrench;
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm text-slate-500">{label}</p>

                    <p className="mt-2 text-2xl font-bold text-slate-950">
                        {value}
                    </p>
                </div>

                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                </div>
            </div>
        </div>
    );
}

function Info({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">{label}</p>

            <p className="mt-1 font-semibold text-slate-900">{value}</p>
        </div>
    );
}

function Th({ children }: { children: string }) {
    return (
        <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            {children}
        </th>
    );
}
