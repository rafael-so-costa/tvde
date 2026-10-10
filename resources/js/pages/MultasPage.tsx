import axios from "axios";
import {
    AlertCircle,
    CheckCircle2,
    CircleDollarSign,
    Download,
    Eye,
    FileText,
    LoaderCircle,
    MapPin,
    Pencil,
    Plus,
    ReceiptText,
    RefreshCw,
    Search,
    Trash2,
    Upload,
    X,
} from "lucide-react";
import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";
import {
    downloadAuthenticatedFile,
    openAuthenticatedFile,
} from "../lib/authenticatedFile";
import { useTenant } from "../contexts/TenantContext";
import type { Motorista } from "../types/motorista";
import type { Veiculo } from "../types/veiculo";
import type {
    Multa,
    MultaDocumentoTipo,
    MultaPayload,
    MultaStatus,
    MultaTipo,
} from "../types/multa";

interface Props {
    mode: "management" | "readonly";
}

type StatusFilter = "todos" | MultaStatus;
type TipoFilter = "todos" | MultaTipo;

const tipoLabels: Record<MultaTipo, string> = {
    excesso_velocidade: "Excesso de velocidade",
    estacionamento: "Estacionamento",
    avanco_sinal: "Avanço de sinal",
    outro: "Outro",
};

const statusLabels: Record<MultaStatus, string> = {
    pendente: "Pendente",
    paga: "Paga",
    contestada: "Contestada",
};

const statusClasses: Record<MultaStatus, string> = {
    pendente: "bg-amber-50 text-amber-700",
    paga: "bg-emerald-50 text-emerald-700",
    contestada: "bg-red-50 text-red-700",
};

const documentoLabels: Record<MultaDocumentoTipo, string> = {
    comprovativo_transferencia_motorista: "Comprovativo de transferência",
    folha_multa: "Folha da multa",
    comprovativo_envio_correio: "Comprovativo de envio pelo correio",
    outro: "Outro",
};

const emptyForm: MultaPayload = {
    veiculo_id: "",
    motorista_id: null,
    numero_notificacao: null,
    data_multa: "",
    tipo: "outro",
    valor: 0,
    status: "pendente",
    localizacao: null,
    descricao: null,
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

    const raw = value.slice(0, 10);
    const [year, month, day] = raw.split("-");

    return day && month && year ? `${day}/${month}/${year}` : value;
}

function money(value: string | number): string {
    return new Intl.NumberFormat("pt-PT", {
        style: "currency",
        currency: "EUR",
    }).format(Number(value) || 0);
}

function bytes(value: number): string {
    if (value < 1024) {
        return `${value} B`;
    }

    if (value < 1024 * 1024) {
        return `${(value / 1024).toFixed(0)} KB`;
    }

    return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

export default function MultasPage({ mode }: Props) {
    const { tenant } = useTenant();
    const queryClient = useQueryClient();

    const readonly = mode === "readonly";

    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<StatusFilter>("todos");
    const [tipo, setTipo] = useState<TipoFilter>("todos");

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<Multa | null>(null);
    const [form, setForm] = useState<MultaPayload>(emptyForm);

    const [selectedId, setSelectedId] = useState<string | null>(null);

    const [documentType, setDocumentType] =
        useState<MultaDocumentoTipo>("folha_multa");

    const [documentFile, setDocumentFile] = useState<File | null>(null);

    const [error, setError] = useState<string | null>(null);

    const multasQuery = useQuery({
        queryKey: ["multas", tenant?.id],
        enabled: Boolean(tenant?.id),
        queryFn: async () => {
            const response = await api.get("/api/multas");

            return response.data.data as Multa[];
        },
    });

    const detailQuery = useQuery({
        queryKey: ["multa-detail", tenant?.id, selectedId],
        enabled: Boolean(tenant?.id && selectedId),
        queryFn: async () => {
            const response = await api.get(`/api/multas/${selectedId}`);

            return response.data.data as Multa;
        },
    });

    const veiculosQuery = useQuery({
        queryKey: ["multas-veiculos", tenant?.id],
        enabled: Boolean(tenant?.id && formOpen && !readonly),
        queryFn: async () => {
            const response = await api.get("/api/veiculos");

            return response.data.data as Veiculo[];
        },
    });

    const motoristasQuery = useQuery({
        queryKey: ["multas-motoristas", tenant?.id],
        enabled: Boolean(tenant?.id && formOpen && !readonly),
        queryFn: async () => {
            const response = await api.get("/api/motoristas");

            return response.data.data as Motorista[];
        },
    });

    async function refresh() {
        await queryClient.invalidateQueries({
            queryKey: ["multas", tenant?.id],
        });

        if (selectedId) {
            await queryClient.invalidateQueries({
                queryKey: ["multa-detail", tenant?.id, selectedId],
            });
        }
    }

    const saveMutation = useMutation({
        mutationFn: async () => {
            const payload = {
                ...form,
                motorista_id: form.motorista_id || null,
                numero_notificacao: form.numero_notificacao?.trim() || null,
                localizacao: form.localizacao?.trim() || null,
                descricao: form.descricao?.trim() || null,
                valor: Number(form.valor),
            };

            if (editing) {
                await api.patch(`/api/multas/${editing.id}`, payload);

                return;
            }

            await api.post("/api/multas", payload);
        },
        onSuccess: async () => {
            closeForm();
            await refresh();
        },
        onError: (exception) => {
            setError(apiError(exception));
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/api/multas/${id}`);
        },
        onSuccess: async () => {
            setSelectedId(null);
            await refresh();
        },
        onError: (exception) => {
            window.alert(apiError(exception));
        },
    });

    const uploadMutation = useMutation({
        mutationFn: async () => {
            if (!selectedId || !documentFile) {
                return;
            }

            const data = new FormData();

            data.append("tipo", documentType);
            data.append("arquivo", documentFile);

            await api.post(`/api/multas/${selectedId}/documentos`, data);
        },
        onSuccess: async () => {
            setDocumentFile(null);
            setDocumentType("folha_multa");

            await refresh();
        },
        onError: (exception) => {
            setError(apiError(exception));
        },
    });

    const deleteDocumentMutation = useMutation({
        mutationFn: async (documentId: string) => {
            if (!selectedId) {
                return;
            }

            await api.delete(
                `/api/multas/${selectedId}/documentos/${documentId}`,
            );
        },
        onSuccess: refresh,
        onError: (exception) => {
            window.alert(apiError(exception));
        },
    });

    function newFine() {
        setEditing(null);
        setForm(emptyForm);
        setError(null);
        setFormOpen(true);
    }

    function editFine(item: Multa) {
        setEditing(item);

        setForm({
            veiculo_id: item.veiculo_id,
            motorista_id: item.motorista_id,
            numero_notificacao: item.numero_notificacao,
            data_multa: item.data_multa.slice(0, 10),
            tipo: item.tipo,
            valor: Number(item.valor),
            status: item.status,
            localizacao: item.localizacao,
            descricao: item.descricao,
        });

        setError(null);
        setFormOpen(true);
    }

    function closeForm() {
        setFormOpen(false);
        setEditing(null);
        setForm(emptyForm);
        setError(null);
    }

    function submit(event: FormEvent) {
        event.preventDefault();

        if (!form.veiculo_id || !form.data_multa || Number(form.valor) <= 0) {
            setError("Preencha veículo, data e valor.");

            return;
        }

        saveMutation.mutate();
    }

    function chooseFile(event: ChangeEvent<HTMLInputElement>) {
        setDocumentFile(event.target.files?.[0] ?? null);
    }

    function removeFine(item: Multa) {
        if (
            !window.confirm(
                `Eliminar a multa ${item.numero_notificacao ?? ""}?`,
            )
        ) {
            return;
        }

        deleteMutation.mutate(item.id);
    }

    const items = useMemo(() => {
        const list = multasQuery.data ?? [];
        const term = search.trim().toLocaleLowerCase("pt-PT");

        return list.filter((item) => {
            if (status !== "todos" && item.status !== status) {
                return false;
            }

            if (tipo !== "todos" && item.tipo !== tipo) {
                return false;
            }

            if (!term) {
                return true;
            }

            return [
                item.numero_notificacao,
                item.veiculo?.matricula,
                item.veiculo?.marca,
                item.veiculo?.modelo,
                item.motorista?.nome_completo,
                item.motorista?.nif,
                item.localizacao,
            ]
                .filter(Boolean)
                .some((value) =>
                    String(value).toLocaleLowerCase("pt-PT").includes(term),
                );
        });
    }, [multasQuery.data, search, status, tipo]);

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
                            Selecione uma organização antes de consultar as
                            multas.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const all = multasQuery.data ?? [];

    const pending = all.filter((item) => item.status === "pendente").length;

    const paid = all.filter((item) => item.status === "paga").length;

    const contested = all.filter((item) => item.status === "contestada").length;

    const total = all.reduce((sum, item) => sum + Number(item.valor), 0);

    const selected = detailQuery.data;

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <p className="text-sm font-medium text-indigo-600 mb-2">
                        {readonly ? "Minha área" : "Operação"}
                    </p>

                    <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                        Multas
                    </h1>

                    <p className="mt-2 text-slate-500">
                        {readonly
                            ? "Consulte multas, infrações e respetivos documentos."
                            : "Gestão de multas, infrações, pagamentos e documentos."}
                    </p>
                </div>

                <div className="flex gap-3">
                    <button
                        type="button"
                        disabled={multasQuery.isFetching}
                        onClick={refresh}
                        className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 flex items-center gap-2"
                    >
                        <RefreshCw
                            className={[
                                "w-4 h-4",
                                multasQuery.isFetching ? "animate-spin" : "",
                            ].join(" ")}
                        />
                        Atualizar
                    </button>

                    {!readonly && (
                        <button
                            type="button"
                            onClick={newFine}
                            className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Nova multa
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Stat
                    icon={CircleDollarSign}
                    label="Valor total"
                    value={money(total)}
                />

                <Stat
                    icon={ReceiptText}
                    label="Pendentes"
                    value={String(pending)}
                />

                <Stat icon={CheckCircle2} label="Pagas" value={String(paid)} />

                <Stat
                    icon={AlertCircle}
                    label="Contestadas"
                    value={String(contested)}
                />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="p-5 border-b border-slate-200">
                    <div className="grid lg:grid-cols-[1fr_190px_220px] gap-3">
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                            <input
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Pesquisar notificação, matrícula, motorista..."
                                className="w-full h-11 rounded-xl border border-slate-200 pl-10 pr-4 text-sm outline-none focus:border-indigo-500"
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

                            <option value="pendente">Pendente</option>

                            <option value="paga">Paga</option>

                            <option value="contestada">Contestada</option>
                        </select>

                        <select
                            value={tipo}
                            onChange={(event) =>
                                setTipo(event.target.value as TipoFilter)
                            }
                            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"
                        >
                            <option value="todos">Todos os tipos</option>

                            {Object.entries(tipoLabels).map(
                                ([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ),
                            )}
                        </select>
                    </div>
                </div>

                {multasQuery.isLoading ? (
                    <div className="py-20 flex justify-center">
                        <LoaderCircle className="w-8 h-8 animate-spin text-indigo-600" />
                    </div>
                ) : multasQuery.isError ? (
                    <div className="py-16 text-center">
                        <AlertCircle className="w-10 h-10 mx-auto text-red-500" />

                        <p className="mt-3 font-semibold text-slate-900">
                            Não foi possível carregar as multas
                        </p>
                    </div>
                ) : items.length === 0 ? (
                    <div className="py-20 text-center">
                        <ReceiptText className="w-12 h-12 mx-auto text-slate-300" />

                        <p className="mt-4 font-semibold text-slate-900">
                            Nenhuma multa encontrada
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <Th>Infração</Th>
                                    <Th>Veículo</Th>
                                    <Th>Motorista</Th>
                                    <Th>Data</Th>
                                    <Th>Valor</Th>
                                    <Th>Estado</Th>
                                    <Th>Ações</Th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {items.map((item) => (
                                    <tr
                                        key={item.id}
                                        className="hover:bg-slate-50"
                                    >
                                        <td className="px-5 py-4">
                                            <div className="font-semibold text-sm text-slate-900">
                                                {tipoLabels[item.tipo]}
                                            </div>

                                            <div className="mt-1 text-xs text-slate-500">
                                                {item.numero_notificacao ??
                                                    "Sem nº de notificação"}
                                            </div>
                                        </td>

                                        <td className="px-5 py-4">
                                            <div className="font-medium text-sm text-slate-900">
                                                {item.veiculo?.matricula ?? "—"}
                                            </div>

                                            <div className="mt-1 text-xs text-slate-500">
                                                {[
                                                    item.veiculo?.marca,
                                                    item.veiculo?.modelo,
                                                ]
                                                    .filter(Boolean)
                                                    .join(" ")}
                                            </div>
                                        </td>

                                        <td className="px-5 py-4 text-sm text-slate-600">
                                            {item.motorista?.nome_completo ??
                                                "—"}
                                        </td>

                                        <td className="px-5 py-4 text-sm text-slate-600 whitespace-nowrap">
                                            {formatDate(item.data_multa)}
                                        </td>

                                        <td className="px-5 py-4 font-semibold text-slate-900 whitespace-nowrap">
                                            {money(item.valor)}
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

                                        <td className="px-5 py-4">
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setSelectedId(item.id)
                                                    }
                                                    className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-indigo-600"
                                                    title="Ver"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>

                                                {!readonly && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                editFine(item)
                                                            }
                                                            className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-indigo-600"
                                                            title="Editar"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                removeFine(item)
                                                            }
                                                            className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-red-600"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
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

            {formOpen && !readonly && (
                <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm p-4 flex items-center justify-center">
                    <form
                        onSubmit={submit}
                        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
                    >
                        <div className="sticky top-0 bg-white px-6 py-5 border-b border-slate-200 flex items-center justify-between z-10">
                            <div>
                                <h2 className="font-bold text-xl text-slate-950">
                                    {editing ? "Editar multa" : "Nova multa"}
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    Dados da infração e respetivo estado.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={closeForm}
                                className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div className="grid md:grid-cols-2 gap-4">
                                <Field label="Veículo *">
                                    <select
                                        value={form.veiculo_id}
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                veiculo_id: event.target.value,
                                            })
                                        }
                                        className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                                    >
                                        <option value="">
                                            Selecionar veículo
                                        </option>

                                        {(veiculosQuery.data ?? []).map(
                                            (item) => (
                                                <option
                                                    key={item.id}
                                                    value={item.id}
                                                >
                                                    {item.matricula} —{" "}
                                                    {item.marca} {item.modelo}
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </Field>

                                <Field label="Motorista">
                                    <select
                                        value={form.motorista_id ?? ""}
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                motorista_id:
                                                    event.target.value || null,
                                            })
                                        }
                                        className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                                    >
                                        <option value="">
                                            Sem motorista associado
                                        </option>

                                        {(motoristasQuery.data ?? []).map(
                                            (item) => (
                                                <option
                                                    key={item.id}
                                                    value={item.id}
                                                >
                                                    {item.nome_completo}
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </Field>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <Field label="Nº de notificação">
                                    <input
                                        value={form.numero_notificacao ?? ""}
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                numero_notificacao:
                                                    event.target.value,
                                            })
                                        }
                                        className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                                        placeholder="NOT-2026-001"
                                    />
                                </Field>

                                <Field label="Data da infração *">
                                    <input
                                        type="date"
                                        value={form.data_multa}
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                data_multa: event.target.value,
                                            })
                                        }
                                        className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                                    />
                                </Field>
                            </div>

                            <div className="grid md:grid-cols-3 gap-4">
                                <Field label="Tipo">
                                    <select
                                        value={form.tipo}
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                tipo: event.target
                                                    .value as MultaTipo,
                                            })
                                        }
                                        className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                                    >
                                        {Object.entries(tipoLabels).map(
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

                                <Field label="Valor (€) *">
                                    <input
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        value={form.valor || ""}
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                valor: Number(
                                                    event.target.value,
                                                ),
                                            })
                                        }
                                        className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                                    />
                                </Field>

                                <Field label="Estado">
                                    <select
                                        value={form.status}
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                status: event.target
                                                    .value as MultaStatus,
                                            })
                                        }
                                        className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                                    >
                                        {Object.entries(statusLabels).map(
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

                            <Field label="Local da infração">
                                <input
                                    value={form.localizacao ?? ""}
                                    onChange={(event) =>
                                        setForm({
                                            ...form,
                                            localizacao: event.target.value,
                                        })
                                    }
                                    className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                                    placeholder="A1, km 45"
                                />
                            </Field>

                            <Field label="Descrição">
                                <textarea
                                    rows={4}
                                    value={form.descricao ?? ""}
                                    onChange={(event) =>
                                        setForm({
                                            ...form,
                                            descricao: event.target.value,
                                        })
                                    }
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 resize-none"
                                />
                            </Field>

                            {error && (
                                <div className="rounded-xl bg-red-50 text-red-700 p-3 text-sm">
                                    {error}
                                </div>
                            )}
                        </div>

                        <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={closeForm}
                                className="h-10 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600"
                            >
                                Cancelar
                            </button>

                            <button
                                type="submit"
                                disabled={saveMutation.isPending}
                                className="h-10 px-5 rounded-xl bg-indigo-600 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                            >
                                {saveMutation.isPending && (
                                    <LoaderCircle className="w-4 h-4 animate-spin" />
                                )}
                                Guardar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {selectedId && (
                <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm p-4 flex items-center justify-center">
                    <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
                        <div className="sticky top-0 bg-white px-6 py-5 border-b border-slate-200 flex items-center justify-between z-10">
                            <div>
                                <h2 className="font-bold text-xl text-slate-950">
                                    Detalhes da multa
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    {selected?.numero_notificacao ??
                                        "Sem número de notificação"}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setSelectedId(null)}
                                className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {detailQuery.isLoading || !selected ? (
                            <div className="py-20 flex justify-center">
                                <LoaderCircle className="w-8 h-8 animate-spin text-indigo-600" />
                            </div>
                        ) : (
                            <div className="p-6 space-y-6">
                                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <Info
                                        label="Tipo"
                                        value={tipoLabels[selected.tipo]}
                                    />

                                    <Info
                                        label="Data"
                                        value={formatDate(selected.data_multa)}
                                    />

                                    <Info
                                        label="Valor"
                                        value={money(selected.valor)}
                                    />

                                    <Info
                                        label="Estado"
                                        value={statusLabels[selected.status]}
                                    />
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="rounded-xl bg-slate-50 p-4">
                                        <p className="text-xs text-slate-500">
                                            Veículo
                                        </p>

                                        <p className="mt-1 font-semibold text-slate-900">
                                            {selected.veiculo?.matricula ?? "—"}
                                        </p>

                                        <p className="text-sm text-slate-500">
                                            {selected.veiculo?.marca}{" "}
                                            {selected.veiculo?.modelo}
                                        </p>
                                    </div>

                                    <div className="rounded-xl bg-slate-50 p-4">
                                        <p className="text-xs text-slate-500">
                                            Motorista
                                        </p>

                                        <p className="mt-1 font-semibold text-slate-900">
                                            {selected.motorista
                                                ?.nome_completo ??
                                                "Não associado"}
                                        </p>
                                    </div>
                                </div>

                                {selected.localizacao && (
                                    <div className="flex gap-3 rounded-xl bg-slate-50 p-4">
                                        <MapPin className="w-5 h-5 text-indigo-600 shrink-0" />

                                        <div>
                                            <p className="text-xs text-slate-500">
                                                Local
                                            </p>

                                            <p className="mt-1 text-sm font-medium text-slate-900">
                                                {selected.localizacao}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {selected.descricao && (
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900 mb-2">
                                            Descrição
                                        </p>

                                        <p className="text-sm text-slate-600 whitespace-pre-wrap">
                                            {selected.descricao}
                                        </p>
                                    </div>
                                )}

                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-semibold text-slate-900">
                                            Documentos
                                        </h3>

                                        <span className="text-xs text-slate-500">
                                            {selected.documentos?.length ?? 0}{" "}
                                            ficheiro(s)
                                        </span>
                                    </div>

                                    <div className="space-y-2">
                                        {(selected.documentos ?? []).map(
                                            (document) => (
                                                <div
                                                    key={document.id}
                                                    className="rounded-xl border border-slate-200 p-3 flex items-center justify-between gap-3"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <FileText className="w-5 h-5 text-indigo-500 shrink-0" />

                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium text-slate-900 truncate">
                                                                {
                                                                    document.arquivo_nome
                                                                }
                                                            </p>

                                                            <p className="text-xs text-slate-500">
                                                                {
                                                                    documentoLabels[
                                                                        document
                                                                            .tipo
                                                                    ]
                                                                }{" "}
                                                                ·{" "}
                                                                {bytes(
                                                                    document.arquivo_tamanho,
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-2 shrink-0">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                void openAuthenticatedFile(
                                                                    `/api/multas/${selected.id}/documentos/${document.id}/arquivo`,
                                                                ).catch(
                                                                    (error) =>
                                                                        setError(
                                                                            error instanceof
                                                                                Error
                                                                                ? error.message
                                                                                : apiError(
                                                                                      error,
                                                                                  ),
                                                                        ),
                                                                );
                                                            }}
                                                            className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-indigo-600"
                                                            title="Visualizar"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                void downloadAuthenticatedFile(
                                                                    `/api/multas/${selected.id}/documentos/${document.id}/arquivo/download`,
                                                                    document.arquivo_nome,
                                                                ).catch(
                                                                    (error) =>
                                                                        setError(
                                                                            error instanceof
                                                                                Error
                                                                                ? error.message
                                                                                : apiError(
                                                                                      error,
                                                                                  ),
                                                                        ),
                                                                );
                                                            }}
                                                            className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-indigo-600"
                                                            title="Descarregar"
                                                        >
                                                            <Download className="w-4 h-4" />
                                                        </button>

                                                        {!readonly && (
                                                            <button
                                                                type="button"
                                                                disabled={
                                                                    deleteDocumentMutation.isPending
                                                                }
                                                                onClick={() => {
                                                                    if (
                                                                        window.confirm(
                                                                            "Eliminar este documento?",
                                                                        )
                                                                    ) {
                                                                        deleteDocumentMutation.mutate(
                                                                            document.id,
                                                                        );
                                                                    }
                                                                }}
                                                                className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-red-600"
                                                                title="Eliminar"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ),
                                        )}

                                        {!selected.documentos?.length && (
                                            <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-500">
                                                Nenhum documento associado.
                                            </div>
                                        )}
                                    </div>

                                    {!readonly && (
                                        <div className="mt-4 rounded-xl bg-slate-50 p-4">
                                            <div className="grid md:grid-cols-[220px_1fr_auto] gap-3">
                                                <select
                                                    value={documentType}
                                                    onChange={(event) =>
                                                        setDocumentType(
                                                            event.target
                                                                .value as MultaDocumentoTipo,
                                                        )
                                                    }
                                                    className="input"
                                                >
                                                    {Object.entries(
                                                        documentoLabels,
                                                    ).map(([value, label]) => (
                                                        <option
                                                            key={value}
                                                            value={value}
                                                        >
                                                            {label}
                                                        </option>
                                                    ))}
                                                </select>

                                                <input
                                                    type="file"
                                                    accept=".pdf,.jpg,.jpeg,.png"
                                                    onChange={chooseFile}
                                                    className="block w-full text-sm text-slate-600 file:mr-3 file:h-10 file:border-0 file:rounded-lg file:bg-white file:px-4 file:text-sm file:font-semibold"
                                                />

                                                <button
                                                    type="button"
                                                    disabled={
                                                        !documentFile ||
                                                        uploadMutation.isPending
                                                    }
                                                    onClick={() =>
                                                        uploadMutation.mutate()
                                                    }
                                                    className="h-11 px-4 rounded-xl bg-indigo-600 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                                                >
                                                    {uploadMutation.isPending ? (
                                                        <LoaderCircle className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Upload className="w-4 h-4" />
                                                    )}
                                                    Enviar
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function Stat({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof ReceiptText;
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

function Field({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <label className="block">
            <span className="block mb-1 text-sm font-medium text-slate-700">
                {label}
            </span>

            {children}
        </label>
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
        <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
            {children}
        </th>
    );
}
