import axios from "axios";
import { useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    AlertCircle,
    Ban,
    CheckCircle2,
    Cpu,
    Eye,
    Gauge,
    LoaderCircle,
    Plus,
    RefreshCw,
    Search,
    TriangleAlert,
    Wrench,
    X,
} from "lucide-react";
import api from "../../lib/api";
import { useTenant } from "../../contexts/TenantContext";
import DiagnosticoManutencaoModal from "./DiagnosticoManutencaoModal";
import type {
    DiagnosticoFonte,
    DiagnosticoSeveridade,
    DiagnosticoStatus,
    Manutencao,
    VeiculoDiagnostico,
    VeiculoDiagnosticoPayload,
} from "../../types/manutencao";

interface VeiculoLookup {
    id: string;
    matricula: string;
    marca: string | null;
    modelo: string | null;
    km_atual: number | null;
    disponibilidade: string | null;
}

interface FormState {
    veiculo_id: string;
    fonte: DiagnosticoFonte;
    codigo_dtc: string;
    severidade: DiagnosticoSeveridade;
    titulo: string;
    descricao: string;
    detectado_em: string;
}

type StatusFilter = "todos" | DiagnosticoStatus;
type SeveridadeFilter = "todas" | DiagnosticoSeveridade;

const inputClass =
    "w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

const severityLabels: Record<DiagnosticoSeveridade, string> = {
    info: "Informação",
    baixa: "Baixa",
    media: "Média",
    alta: "Alta",
    critica: "Crítica",
};

const severityClasses: Record<DiagnosticoSeveridade, string> = {
    info: "bg-slate-100 text-slate-600",
    baixa: "bg-blue-50 text-blue-700",
    media: "bg-amber-50 text-amber-700",
    alta: "bg-orange-50 text-orange-700",
    critica: "bg-red-50 text-red-700",
};

const statusLabels: Record<DiagnosticoStatus, string> = {
    aberto: "Aberto",
    resolvido: "Resolvido",
    ignorado: "Ignorado",
};

const statusClasses: Record<DiagnosticoStatus, string> = {
    aberto: "bg-red-50 text-red-700",
    resolvido: "bg-emerald-50 text-emerald-700",
    ignorado: "bg-slate-100 text-slate-600",
};

const fonteLabels: Record<DiagnosticoFonte, string> = {
    manual: "Manual",
    obd: "OBD",
    tesla: "Tesla",
    geotab: "Geotab",
    outro: "Outro",
};

function localDateTime(): string {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;

    return new Date(now.getTime() - offset).toISOString().slice(0, 16);
}

function emptyForm(): FormState {
    return {
        veiculo_id: "",
        fonte: "manual",
        codigo_dtc: "",
        severidade: "media",
        titulo: "",
        descricao: "",
        detectado_em: localDateTime(),
    };
}

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

function dateTime(value: string | null | undefined): string {
    if (!value) {
        return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat("pt-PT", {
        dateStyle: "short",
        timeStyle: "short",
    }).format(date);
}

function km(value: number | null | undefined): string {
    if (value === null || value === undefined) {
        return "—";
    }

    return `${value.toLocaleString("pt-PT")} km`;
}

export default function DiagnosticosTab() {
    const { tenant } = useTenant();
    const queryClient = useQueryClient();

    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<StatusFilter>("todos");
    const [severity, setSeverity] = useState<SeveridadeFilter>("todas");

    const [selectedId, setSelectedId] = useState<string | null>(null);

    const [formOpen, setFormOpen] = useState(false);
    const [form, setForm] = useState<FormState>(emptyForm());
    const [error, setError] = useState<string | null>(null);
    const [maintenanceDiagnostic, setMaintenanceDiagnostic] =
        useState<VeiculoDiagnostico | null>(null);

    const listQuery = useQuery({
        queryKey: ["diagnosticos", tenant?.id],
        enabled: Boolean(tenant?.id),
        queryFn: async () => {
            const response = await api.get("/api/diagnosticos");

            return response.data.data as VeiculoDiagnostico[];
        },
    });

    const detailQuery = useQuery({
        queryKey: ["diagnostico", tenant?.id, selectedId],
        enabled: Boolean(tenant?.id && selectedId),
        queryFn: async () => {
            const response = await api.get(`/api/diagnosticos/${selectedId}`);

            return response.data.data as VeiculoDiagnostico;
        },
    });

    const vehiclesQuery = useQuery({
        queryKey: ["veiculos", tenant?.id, "diagnosticos"],
        enabled: Boolean(tenant?.id),
        queryFn: async () => {
            const response = await api.get("/api/veiculos");

            return response.data.data as VeiculoLookup[];
        },
    });

    async function refresh(id?: string | null) {
        await queryClient.invalidateQueries({
            queryKey: ["diagnosticos", tenant?.id],
        });

        if (id) {
            await queryClient.invalidateQueries({
                queryKey: ["diagnostico", tenant?.id, id],
            });
        }
    }

    async function maintenanceCreated(manutencao: Manutencao) {
        const diagnosticId = maintenanceDiagnostic?.id ?? selectedId;

        setMaintenanceDiagnostic(null);

        await queryClient.invalidateQueries({
            queryKey: ["manutencoes", tenant?.id],
        });

        if (diagnosticId) {
            await refresh(diagnosticId);
        }

        await queryClient.invalidateQueries({
            queryKey: ["manutencao", tenant?.id, manutencao.id],
        });
    }

    const createMutation = useMutation({
        mutationFn: async () => {
            const payload: VeiculoDiagnosticoPayload = {
                veiculo_id: form.veiculo_id,
                fonte: form.fonte,

                codigo_dtc: form.codigo_dtc.trim() || null,

                severidade: form.severidade,

                titulo: form.titulo.trim(),

                descricao: form.descricao.trim() || null,

                detectado_em: form.detectado_em,
            };

            const response = await api.post("/api/diagnosticos", payload);

            return response.data.data as VeiculoDiagnostico;
        },

        onMutate: () => {
            setError(null);
        },

        onSuccess: async (diagnostic) => {
            setFormOpen(false);
            setForm(emptyForm());
            setSelectedId(diagnostic.id);

            await refresh(diagnostic.id);
        },

        onError: (error) => {
            setError(apiError(error));
        },
    });

    const statusMutation = useMutation({
        mutationFn: async ({
            diagnostic,
            action,
        }: {
            diagnostic: VeiculoDiagnostico;
            action: "resolver" | "ignorar";
        }) => {
            const message =
                action === "resolver"
                    ? "Marcar este diagnóstico como resolvido?"
                    : "Ignorar este diagnóstico?";

            if (!window.confirm(message)) {
                throw new Error("__cancelled__");
            }

            const response = await api.post(
                `/api/diagnosticos/${diagnostic.id}/${action}`,
            );

            return response.data.data as VeiculoDiagnostico;
        },

        onMutate: () => {
            setError(null);
        },

        onSuccess: async (diagnostic) => {
            await refresh(diagnostic.id);
        },

        onError: (error) => {
            if (error instanceof Error && error.message === "__cancelled__") {
                return;
            }

            setError(apiError(error));
        },
    });

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        createMutation.mutate();
    }

    const diagnostics = listQuery.data ?? [];

    const filtered = useMemo(() => {
        const term = search.trim().toLocaleLowerCase("pt-PT");

        return diagnostics.filter((item) => {
            if (status !== "todos" && item.status !== status) {
                return false;
            }

            if (severity !== "todas" && item.severidade !== severity) {
                return false;
            }

            if (!term) {
                return true;
            }

            return [
                item.codigo_dtc,
                item.titulo,
                item.descricao,
                item.veiculo?.matricula,
                item.veiculo?.marca,
                item.veiculo?.modelo,
            ]
                .filter(Boolean)
                .join(" ")
                .toLocaleLowerCase("pt-PT")
                .includes(term);
        });
    }, [diagnostics, search, status, severity]);

    const stats = useMemo(
        () => ({
            total: diagnostics.length,

            abertos: diagnostics.filter((item) => item.status === "aberto")
                .length,

            criticos: diagnostics.filter(
                (item) =>
                    item.status === "aberto" && item.severidade === "critica",
            ).length,

            ligados: diagnostics.filter((item) => Boolean(item.manutencao_id))
                .length,
        }),
        [diagnostics],
    );

    const selected = detailQuery.data ?? null;

    const validForm = Boolean(
        form.veiculo_id && form.titulo.trim() && form.detectado_em,
    );

    return (
        <div className="space-y-5">
            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={() => {
                        setError(null);
                        setForm(emptyForm());
                        setFormOpen(true);
                    }}
                    className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    Registar diagnóstico
                </button>
            </div>

            {error && <ErrorBox message={error} />}

            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <Stat
                    label="Diagnósticos"
                    value={String(stats.total)}
                    icon={Cpu}
                />

                <Stat
                    label="Em aberto"
                    value={String(stats.abertos)}
                    icon={AlertCircle}
                />

                <Stat
                    label="Críticos abertos"
                    value={String(stats.criticos)}
                    icon={TriangleAlert}
                />

                <Stat
                    label="Com manutenção"
                    value={String(stats.ligados)}
                    icon={Gauge}
                />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="grid lg:grid-cols-[1fr_190px_190px_auto] gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Pesquisar código, título, matrícula..."
                            className="w-full h-11 rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-indigo-500"
                        />
                    </div>

                    <select
                        value={status}
                        onChange={(event) =>
                            setStatus(event.target.value as StatusFilter)
                        }
                        className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"
                    >
                        <option value="todos">Todos os estados</option>

                        <option value="aberto">Abertos</option>

                        <option value="resolvido">Resolvidos</option>

                        <option value="ignorado">Ignorados</option>
                    </select>

                    <select
                        value={severity}
                        onChange={(event) =>
                            setSeverity(event.target.value as SeveridadeFilter)
                        }
                        className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"
                    >
                        <option value="todas">Todas severidades</option>

                        {Object.entries(severityLabels).map(
                            ([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ),
                        )}
                    </select>

                    <button
                        type="button"
                        onClick={() => listQuery.refetch()}
                        disabled={listQuery.isFetching}
                        className="h-11 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 flex items-center gap-2 disabled:opacity-50"
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
                    <Loader />
                ) : listQuery.isError ? (
                    <ErrorState message={apiError(listQuery.error)} />
                ) : filtered.length === 0 ? (
                    <div className="py-16 text-center">
                        <Cpu className="mx-auto w-10 h-10 text-slate-300" />

                        <p className="mt-3 font-semibold text-slate-700">
                            Nenhum diagnóstico encontrado.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1000px]">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <Th>Veículo</Th>
                                    <Th>Diagnóstico</Th>
                                    <Th>Fonte</Th>
                                    <Th>Severidade</Th>
                                    <Th>Estado</Th>
                                    <Th>Detectado</Th>
                                    <Th>Manutenção</Th>
                                    <th className="w-16" />
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {filtered.map((item) => (
                                    <tr
                                        key={item.id}
                                        className="hover:bg-slate-50/60"
                                    >
                                        <td className="px-5 py-4">
                                            <p className="font-semibold text-slate-900">
                                                {item.veiculo?.matricula ?? "—"}
                                            </p>

                                            <p className="mt-1 text-xs text-slate-500">
                                                {item.veiculo?.marca ?? ""}{" "}
                                                {item.veiculo?.modelo ?? ""}
                                            </p>
                                        </td>

                                        <td className="px-5 py-4">
                                            <p className="font-medium text-slate-900">
                                                {item.titulo}
                                            </p>

                                            {item.codigo_dtc && (
                                                <p className="mt-1 font-mono text-xs text-indigo-600">
                                                    {item.codigo_dtc}
                                                </p>
                                            )}
                                        </td>

                                        <td className="px-5 py-4 text-sm text-slate-600">
                                            {fonteLabels[item.fonte]}
                                        </td>

                                        <td className="px-5 py-4">
                                            <span
                                                className={[
                                                    "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                                                    severityClasses[
                                                        item.severidade
                                                    ],
                                                ].join(" ")}
                                            >
                                                {
                                                    severityLabels[
                                                        item.severidade
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

                                        <td className="px-5 py-4 text-sm text-slate-600">
                                            {dateTime(item.detectado_em)}
                                        </td>

                                        <td className="px-5 py-4 text-sm">
                                            {item.manutencao ? (
                                                <span className="font-semibold text-indigo-600">
                                                    {
                                                        item.manutencao
                                                            .numero_ordem
                                                    }
                                                </span>
                                            ) : (
                                                <span className="text-slate-400">
                                                    —
                                                </span>
                                            )}
                                        </td>

                                        <td className="px-5 py-4">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setSelectedId(item.id)
                                                }
                                                className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-indigo-600"
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

            {formOpen && (
                <div className="fixed inset-0 z-[70] bg-slate-950/60 backdrop-blur-sm p-4 flex items-center justify-center">
                    <div className="w-full max-w-2xl max-h-[94vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
                        <ModalHeader
                            title="Registar diagnóstico"
                            onClose={() => setFormOpen(false)}
                        />

                        <form onSubmit={submit} className="p-6 space-y-5">
                            {createMutation.isError && (
                                <ErrorBox
                                    message={apiError(createMutation.error)}
                                />
                            )}

                            <Field label="Veículo *">
                                <select
                                    required
                                    value={form.veiculo_id}
                                    onChange={(event) =>
                                        setForm((current) => ({
                                            ...current,
                                            veiculo_id: event.target.value,
                                        }))
                                    }
                                    className={inputClass}
                                >
                                    <option value="">Selecione...</option>

                                    {(vehiclesQuery.data ?? []).map(
                                        (vehicle) => (
                                            <option
                                                key={vehicle.id}
                                                value={vehicle.id}
                                            >
                                                {vehicle.matricula} ·{" "}
                                                {vehicle.marca ?? ""}{" "}
                                                {vehicle.modelo ?? ""}
                                            </option>
                                        ),
                                    )}
                                </select>
                            </Field>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <Field label="Fonte *">
                                    <select
                                        value={form.fonte}
                                        onChange={(event) =>
                                            setForm((current) => ({
                                                ...current,
                                                fonte: event.target
                                                    .value as DiagnosticoFonte,
                                            }))
                                        }
                                        className={inputClass}
                                    >
                                        {Object.entries(fonteLabels).map(
                                            ([value, label]) => (
                                                <option
                                                    key={value}
                                                    value={value}
                                                >
                                                    {label}
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </Field>

                                <Field label="Severidade *">
                                    <select
                                        value={form.severidade}
                                        onChange={(event) =>
                                            setForm((current) => ({
                                                ...current,
                                                severidade: event.target
                                                    .value as DiagnosticoSeveridade,
                                            }))
                                        }
                                        className={inputClass}
                                    >
                                        {Object.entries(severityLabels).map(
                                            ([value, label]) => (
                                                <option
                                                    key={value}
                                                    value={value}
                                                >
                                                    {label}
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </Field>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <Field label="Código DTC">
                                    <input
                                        maxLength={100}
                                        value={form.codigo_dtc}
                                        onChange={(event) =>
                                            setForm((current) => ({
                                                ...current,
                                                codigo_dtc: event.target.value,
                                            }))
                                        }
                                        className={inputClass}
                                        placeholder="Ex.: P0420"
                                    />
                                </Field>

                                <Field label="Detectado em *">
                                    <input
                                        required
                                        type="datetime-local"
                                        value={form.detectado_em}
                                        onChange={(event) =>
                                            setForm((current) => ({
                                                ...current,
                                                detectado_em:
                                                    event.target.value,
                                            }))
                                        }
                                        className={inputClass}
                                    />
                                </Field>
                            </div>

                            <Field label="Título *">
                                <input
                                    required
                                    maxLength={255}
                                    value={form.titulo}
                                    onChange={(event) =>
                                        setForm((current) => ({
                                            ...current,
                                            titulo: event.target.value,
                                        }))
                                    }
                                    className={inputClass}
                                    placeholder="Ex.: Falha no sistema de emissões"
                                />
                            </Field>

                            <Field label="Descrição">
                                <textarea
                                    rows={5}
                                    value={form.descricao}
                                    onChange={(event) =>
                                        setForm((current) => ({
                                            ...current,
                                            descricao: event.target.value,
                                        }))
                                    }
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                                />
                            </Field>

                            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
                                Os conectores OBD, Tesla e Geotab já estão
                                previstos na arquitetura. A ingestão automática
                                permanece sem endpoint público até configurarmos
                                os fornecedores e respetivas credenciais.
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => setFormOpen(false)}
                                    className="h-10 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    disabled={
                                        createMutation.isPending || !validForm
                                    }
                                    className="h-10 px-5 rounded-xl bg-indigo-600 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                                >
                                    {createMutation.isPending && (
                                        <LoaderCircle className="w-4 h-4 animate-spin" />
                                    )}
                                    Registar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {selectedId && (
                <div className="fixed inset-0 z-[65] bg-slate-950/60 backdrop-blur-sm p-4 flex items-center justify-center">
                    <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
                        <ModalHeader
                            title="Diagnóstico"
                            onClose={() => setSelectedId(null)}
                        />

                        {detailQuery.isLoading ? (
                            <Loader />
                        ) : detailQuery.isError || !selected ? (
                            <ErrorState message={apiError(detailQuery.error)} />
                        ) : (
                            <div className="p-6 space-y-6">
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="text-xl font-bold text-slate-950">
                                                {selected.titulo}
                                            </h3>

                                            <span
                                                className={[
                                                    "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                                                    severityClasses[
                                                        selected.severidade
                                                    ],
                                                ].join(" ")}
                                            >
                                                {
                                                    severityLabels[
                                                        selected.severidade
                                                    ]
                                                }
                                            </span>

                                            <span
                                                className={[
                                                    "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                                                    statusClasses[
                                                        selected.status
                                                    ],
                                                ].join(" ")}
                                            >
                                                {statusLabels[selected.status]}
                                            </span>
                                        </div>

                                        {selected.codigo_dtc && (
                                            <p className="mt-2 font-mono text-sm text-indigo-600">
                                                {selected.codigo_dtc}
                                            </p>
                                        )}
                                    </div>

                                    {selected.status === "aberto" && (
                                        <div className="flex flex-wrap gap-2">
                                            {!selected.manutencao_id && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setMaintenanceDiagnostic(
                                                            selected,
                                                        )
                                                    }
                                                    className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center gap-2"
                                                >
                                                    <Wrench className="w-4 h-4" />
                                                    Gerar ordem
                                                </button>
                                            )}

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    statusMutation.mutate({
                                                        diagnostic: selected,
                                                        action: "resolver",
                                                    })
                                                }
                                                className="h-10 px-4 rounded-xl border border-emerald-200 text-emerald-700 text-sm font-semibold flex items-center gap-2"
                                            >
                                                <CheckCircle2 className="w-4 h-4" />
                                                Resolver
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    statusMutation.mutate({
                                                        diagnostic: selected,
                                                        action: "ignorar",
                                                    })
                                                }
                                                className="h-10 px-4 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold flex items-center gap-2"
                                            >
                                                <Ban className="w-4 h-4" />
                                                Ignorar
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <Info
                                        label="Veículo"
                                        value={
                                            selected.veiculo?.matricula ?? "—"
                                        }
                                    />

                                    <Info
                                        label="Km atual"
                                        value={km(selected.veiculo?.km_atual)}
                                    />

                                    <Info
                                        label="Fonte"
                                        value={fonteLabels[selected.fonte]}
                                    />

                                    <Info
                                        label="Detectado"
                                        value={dateTime(selected.detectado_em)}
                                    />
                                </div>

                                <div className="rounded-xl border border-slate-200 p-5">
                                    <h4 className="font-semibold text-slate-900">
                                        Descrição
                                    </h4>

                                    <p className="mt-3 text-sm text-slate-600 whitespace-pre-wrap">
                                        {selected.descricao || "Sem descrição."}
                                    </p>
                                </div>

                                {selected.manutencao && (
                                    <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
                                            Ordem de manutenção associada
                                        </p>

                                        <p className="mt-2 font-bold text-indigo-900">
                                            {selected.manutencao.numero_ordem}
                                        </p>

                                        <p className="mt-1 text-sm text-indigo-700">
                                            {selected.manutencao.tipo_servico ??
                                                selected.manutencao.status}
                                        </p>
                                    </div>
                                )}

                                {!selected.manutencao_id &&
                                    selected.status === "aberto" && (
                                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                                            <p className="font-semibold text-amber-800">
                                                Sem ordem de manutenção
                                                associada
                                            </p>

                                            <p className="mt-1 text-sm text-amber-700">
                                                Este diagnóstico ainda não
                                                originou uma ordem de
                                                manutenção.
                                            </p>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setMaintenanceDiagnostic(
                                                        selected,
                                                    )
                                                }
                                                className="mt-4 h-10 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold flex items-center gap-2"
                                            >
                                                <Wrench className="w-4 h-4" />
                                                Gerar ordem agora
                                            </button>
                                        </div>
                                    )}
                            </div>
                        )}
                    </div>
                </div>
            )}

         {maintenanceDiagnostic !== null && (
                <DiagnosticoManutencaoModal
                    diagnostic={maintenanceDiagnostic}
                    onClose={() => setMaintenanceDiagnostic(null)}
                    onCreated={maintenanceCreated}
                />
            )}
        </div>
    );
}

function ModalHeader({
    title,
    onClose,
}: {
    title: string;
    onClose: () => void;
}) {
    return (
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-950">{title}</h2>

            <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"
            >
                <X className="w-5 h-5" />
            </button>
        </div>
    );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <label className="block">
            <span className="block mb-1 text-sm font-medium text-slate-700">
                {label}
            </span>

            {children}
        </label>
    );
}

function Stat({
    label,
    value,
    icon: Icon,
}: {
    label: string;
    value: string;
    icon: typeof Cpu;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between">
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

function ErrorBox({ message }: { message: string }) {
    return (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />

            <p className="text-sm text-red-700">{message}</p>
        </div>
    );
}

function Loader() {
    return (
        <div className="py-20 flex justify-center">
            <LoaderCircle className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
    );
}

function ErrorState({ message }: { message: string }) {
    return (
        <div className="py-16 text-center">
            <AlertCircle className="mx-auto w-9 h-9 text-red-500" />

            <p className="mt-3 font-semibold text-slate-800">
                Não foi possível carregar os dados.
            </p>

            <p className="mt-1 text-sm text-slate-500">{message}</p>
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
