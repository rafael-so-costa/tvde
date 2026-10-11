import { FormEvent, useMemo, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    CheckCircle2,
    Edit3,
    LoaderCircle,
    Plus,
    Search,
    Trash2,
    X,
} from "lucide-react";

import {
    deletePlatformNotification,
    fetchPlatformNotification,
    fetchPlatformNotificationMeta,
    fetchPlatformNotifications,
    fetchPlatformNotificationSummary,
    resolvePlatformNotification,
    savePlatformNotification,
} from "../lib/platform-notifications";

import type {
    PlatformNotification,
    PlatformNotificationMeta,
} from "../types/platform-notification";

export default function BackofficeNotificationsPage() {
    const client = useQueryClient();

    const [search, setSearch] = useState("");
    const [type, setType] = useState("");
    const [status, setStatus] = useState("");
    const [page, setPage] = useState(1);

    const [open, setOpen] = useState(false);

    const [editingId, setEditingId] = useState<string | null>(null);

    const metaQuery = useQuery({
        queryKey: ["platform-notifications", "meta"],

        queryFn: fetchPlatformNotificationMeta,
    });

    const summaryQuery = useQuery({
        queryKey: ["platform-notifications", "summary"],

        queryFn: fetchPlatformNotificationSummary,
    });

    const params = useMemo(() => {
        const result: Record<string, unknown> = {
            page,
            per_page: 25,
        };

        if (search.trim()) {
            result.search = search.trim();
        }

        if (type) {
            result.type = type;
        }

        if (status) {
            result.status = status;
        }

        return result;
    }, [search, type, status, page]);

    const listQuery = useQuery({
        queryKey: ["platform-notifications", "list", params],

        queryFn: () => fetchPlatformNotifications(params),
    });

    const detailQuery = useQuery({
        queryKey: ["platform-notifications", "detail", editingId],

        enabled: Boolean(editingId),

        queryFn: () => fetchPlatformNotification(editingId!),
    });

    function refresh() {
        client.invalidateQueries({
            queryKey: ["platform-notifications"],
        });
    }

    const resolveMutation = useMutation({
        mutationFn: resolvePlatformNotification,

        onSuccess: refresh,
    });

    const deleteMutation = useMutation({
        mutationFn: deletePlatformNotification,

        onSuccess: refresh,
    });

    const summary = summaryQuery.data;

    const list = listQuery.data;

    return (
        <div className="mx-auto max-w-7xl space-y-7">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="mb-2 text-sm font-medium text-indigo-600">
                        Comunicação SaaS
                    </p>

                    <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                        Central de Notificações
                    </h1>

                    <p className="mt-2 text-slate-500">
                        Publique novidades, incidentes, manutenções e
                        comunicações para os clientes FrotaPro.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => {
                        setEditingId(null);

                        setOpen(true);
                    }}
                    className={primaryButton}
                >
                    <Plus className="h-4 w-4" />
                    Nova comunicação
                </button>
            </header>

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <Kpi label="Comunicações" value={summary?.total ?? 0} />

                <Kpi label="Publicadas" value={summary?.published ?? 0} />

                <Kpi label="Agendadas" value={summary?.scheduled ?? 0} />

                <Kpi label="Status ativos" value={summary?.incidents ?? 0} />

                <Kpi label="Destinatários" value={summary?.recipients ?? 0} />
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                            value={search}
                            onChange={(event) => {
                                setSearch(event.target.value);

                                setPage(1);
                            }}
                            placeholder="Pesquisar..."
                            className={`${inputClass} pl-9`}
                        />
                    </div>

                    <select
                        value={type}
                        onChange={(event) => {
                            setType(event.target.value);

                            setPage(1);
                        }}
                        className={inputClass}
                    >
                        <option value="">Todos os tipos</option>

                        {(metaQuery.data?.types ?? []).map((item) => (
                            <option key={item.value} value={item.value}>
                                {item.label}
                            </option>
                        ))}
                    </select>

                    <select
                        value={status}
                        onChange={(event) => {
                            setStatus(event.target.value);

                            setPage(1);
                        }}
                        className={inputClass}
                    >
                        <option value="">Todos os estados</option>

                        <option value="published">Publicado</option>

                        <option value="scheduled">Agendado</option>

                        <option value="draft">Rascunho</option>

                        <option value="resolved">Resolvido</option>

                        <option value="expired">Expirado</option>
                    </select>
                </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {listQuery.isLoading ? (
                    <Loading />
                ) : !list?.data?.length ? (
                    <div className="p-14 text-center text-sm text-slate-500">
                        Nenhuma comunicação cadastrada.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr>
                                    <Th>Comunicação</Th>

                                    <Th>Público</Th>

                                    <Th>Estado</Th>

                                    <Th>Tenants</Th>

                                    <Th>Destinatários</Th>

                                    <Th></Th>
                                </tr>
                            </thead>

                            <tbody>
                                {list.data.map((item: PlatformNotification) => (
                                    <tr
                                        key={item.id}
                                        className="border-t border-slate-100"
                                    >
                                        <Td>
                                            <div className="font-semibold text-slate-900">
                                                {item.title}
                                            </div>

                                            <div className="mt-1 text-xs text-slate-400">
                                                {item.type_label}
                                                {" · "}
                                                {item.severity_label}
                                            </div>
                                        </Td>

                                        <Td>
                                            {item.target_scope === "all"
                                                ? "Todos os clientes"
                                                : `${item.tenant_ids.length} tenant(s)`}
                                        </Td>

                                        <Td>{item.status_label}</Td>

                                        <Td>{item.tenants_reached}</Td>

                                        <Td>{item.recipients}</Td>

                                        <Td>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    className={iconButton}
                                                    onClick={() => {
                                                        setEditingId(item.id);

                                                        setOpen(true);
                                                    }}
                                                >
                                                    <Edit3 className="h-4 w-4" />
                                                </button>

                                                {item.status ===
                                                    "published" && (
                                                    <button
                                                        type="button"
                                                        className={iconButton}
                                                        onClick={() =>
                                                            resolveMutation.mutate(
                                                                item.id,
                                                            )
                                                        }
                                                    >
                                                        <CheckCircle2 className="h-4 w-4" />
                                                    </button>
                                                )}

                                                {item.status === "draft" && (
                                                    <button
                                                        type="button"
                                                        className={`${iconButton} text-red-600`}
                                                        onClick={() => {
                                                            if (
                                                                window.confirm(
                                                                    `Eliminar "${item.title}"?`,
                                                                )
                                                            ) {
                                                                deleteMutation.mutate(
                                                                    item.id,
                                                                );
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </Td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {open && metaQuery.data && (
                <NotificationModal
                    meta={metaQuery.data}
                    notification={editingId ? (detailQuery.data ?? null) : null}
                    loading={Boolean(editingId) && detailQuery.isLoading}
                    onClose={() => {
                        setOpen(false);

                        setEditingId(null);
                    }}
                    onSaved={() => {
                        setOpen(false);

                        setEditingId(null);

                        refresh();
                    }}
                />
            )}
        </div>
    );
}

function NotificationModal({
    meta,
    notification,
    loading,
    onClose,
    onSaved,
}: {
    meta: PlatformNotificationMeta;
    notification: PlatformNotification | null;
    loading: boolean;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [form, setForm] = useState({
        type: notification?.type ?? "news",

        title: notification?.title ?? "",

        message: notification?.message ?? "",

        severity: notification?.severity ?? "low",

        target_scope: notification?.target_scope ?? "all",

        tenant_ids: notification?.tenant_ids ?? [],

        audiences: notification?.audiences ?? ["admin_empresa"],

        channels: notification?.channels ?? ["in_app"],

        action_url: notification?.action_url ?? "",

        active: notification?.active ?? false,

        published_at: localDate(notification?.published_at),

        expires_at: localDate(notification?.expires_at),
    });

    const mutation = useMutation({
        mutationFn: () =>
            savePlatformNotification(notification?.id ?? null, {
                ...form,

                action_url: form.action_url || null,

                published_at: form.published_at || null,

                expires_at: form.expires_at || null,
            }),

        onSuccess: onSaved,
    });

    if (loading) {
        return (
            <Modal title="Comunicação" onClose={onClose}>
                <Loading />
            </Modal>
        );
    }

    function toggle(
        field: "audiences" | "channels" | "tenant_ids",
        value: string,
    ) {
        setForm((current) => {
            const values = current[field];

            return {
                ...current,

                [field]: values.includes(value)
                    ? values.filter((item) => item !== value)
                    : [...values, value],
            };
        });
    }

    function submit(event: FormEvent) {
        event.preventDefault();

        mutation.mutate();
    }

    return (
        <Modal
            title={notification ? "Editar comunicação" : "Nova comunicação"}
            onClose={onClose}
        >
            <form onSubmit={submit} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Tipo">
                        <select
                            value={form.type}
                            onChange={(event) =>
                                setForm((current) => ({
                                    ...current,

                                    type: event.target.value,
                                }))
                            }
                            className={inputClass}
                        >
                            {meta.types.map((item) => (
                                <option key={item.value} value={item.value}>
                                    {item.label}
                                </option>
                            ))}
                        </select>
                    </Field>

                    <Field label="Severidade">
                        <select
                            value={form.severity}
                            onChange={(event) =>
                                setForm((current) => ({
                                    ...current,

                                    severity: event.target.value,
                                }))
                            }
                            className={inputClass}
                        >
                            {meta.severities.map((item) => (
                                <option key={item.value} value={item.value}>
                                    {item.label}
                                </option>
                            ))}
                        </select>
                    </Field>
                </div>

                <Field label="Título">
                    <input
                        required
                        value={form.title}
                        onChange={(event) =>
                            setForm((current) => ({
                                ...current,

                                title: event.target.value,
                            }))
                        }
                        className={inputClass}
                    />
                </Field>

                <Field label="Mensagem">
                    <textarea
                        required
                        rows={6}
                        value={form.message}
                        onChange={(event) =>
                            setForm((current) => ({
                                ...current,

                                message: event.target.value,
                            }))
                        }
                        className={`${inputClass} h-auto py-3`}
                    />
                </Field>

                <Field label="Destinatários">
                    <select
                        value={form.target_scope}
                        onChange={(event) =>
                            setForm((current) => ({
                                ...current,

                                target_scope: event.target.value as
                                    | "all"
                                    | "selected",
                            }))
                        }
                        className={inputClass}
                    >
                        {meta.scopes.map((item) => (
                            <option key={item.value} value={item.value}>
                                {item.label}
                            </option>
                        ))}
                    </select>
                </Field>

                {form.target_scope === "selected" && (
                    <Field label="Tenants">
                        <div className="grid max-h-52 gap-2 overflow-y-auto rounded-xl border border-slate-200 p-3 sm:grid-cols-2">
                            {meta.tenants.map((tenant) => (
                                <label
                                    key={tenant.id}
                                    className="flex items-center gap-2 text-sm"
                                >
                                    <input
                                        type="checkbox"
                                        checked={form.tenant_ids.includes(
                                            tenant.id,
                                        )}
                                        onChange={() =>
                                            toggle("tenant_ids", tenant.id)
                                        }
                                    />

                                    {tenant.name}
                                </label>
                            ))}
                        </div>
                    </Field>
                )}

                <Field label="Perfis">
                    <div className="grid gap-2 sm:grid-cols-2">
                        {meta.audiences.map((item) => (
                            <label
                                key={item.value}
                                className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm"
                            >
                                <input
                                    type="checkbox"
                                    checked={form.audiences.includes(
                                        item.value,
                                    )}
                                    onChange={() =>
                                        toggle("audiences", item.value)
                                    }
                                />

                                {item.label}
                            </label>
                        ))}
                    </div>
                </Field>

                <Field label="Canais">
                    <div className="flex flex-wrap gap-4">
                        {meta.channels.map((item) => (
                            <label
                                key={item.value}
                                className="flex items-center gap-2 text-sm"
                            >
                                <input
                                    type="checkbox"
                                    disabled={item.value === "in_app"}
                                    checked={form.channels.includes(item.value)}
                                    onChange={() =>
                                        toggle("channels", item.value)
                                    }
                                />

                                {item.label}
                            </label>
                        ))}
                    </div>
                </Field>

                <Field label="Ação / rota">
                    <input
                        value={form.action_url}
                        onChange={(event) =>
                            setForm((current) => ({
                                ...current,

                                action_url: event.target.value,
                            }))
                        }
                        placeholder="/ajuda ou /helpdesk"
                        className={inputClass}
                    />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Publicar em">
                        <input
                            type="datetime-local"
                            value={form.published_at}
                            onChange={(event) =>
                                setForm((current) => ({
                                    ...current,

                                    published_at: event.target.value,
                                }))
                            }
                            className={inputClass}
                        />
                    </Field>

                    <Field label="Expirar em">
                        <input
                            type="datetime-local"
                            value={form.expires_at}
                            onChange={(event) =>
                                setForm((current) => ({
                                    ...current,

                                    expires_at: event.target.value,
                                }))
                            }
                            className={inputClass}
                        />
                    </Field>
                </div>

                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input
                        type="checkbox"
                        checked={form.active}
                        onChange={(event) =>
                            setForm((current) => ({
                                ...current,

                                active: event.target.checked,
                            }))
                        }
                    />
                    Publicar / ativar comunicação
                </label>

                {mutation.isError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        Não foi possível guardar a comunicação.
                    </div>
                )}

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-5">
                    <button
                        type="button"
                        onClick={onClose}
                        className={secondaryButton}
                    >
                        Cancelar
                    </button>

                    <button
                        disabled={
                            mutation.isPending ||
                            form.audiences.length === 0 ||
                            (form.target_scope === "selected" &&
                                form.tenant_ids.length === 0)
                        }
                        className={primaryButton}
                    >
                        Guardar
                    </button>
                </div>
            </form>
        </Modal>
    );
}

function Modal({
    title,
    children,
    onClose,
}: {
    title: string;
    children: React.ReactNode;
    onClose: () => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
                type="button"
                onClick={onClose}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />

            <div className="relative z-10 max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
                <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
                    <h2 className="font-bold text-slate-950">{title}</h2>

                    <button
                        type="button"
                        onClick={onClose}
                        className={iconButton}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </header>

                <div className="p-6">{children}</div>
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
        <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {label}
            </label>

            {children}
        </div>
    );
}

function Kpi({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {label}
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-950">
                {value.toLocaleString("pt-PT")}
            </p>
        </div>
    );
}

function Th({ children }: { children?: React.ReactNode }) {
    return (
        <th className="whitespace-nowrap bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {children}
        </th>
    );
}

function Td({ children }: { children: React.ReactNode }) {
    return <td className="px-5 py-4 text-sm text-slate-600">{children}</td>;
}

function Loading() {
    return (
        <div className="flex justify-center py-16">
            <LoaderCircle className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
    );
}

function localDate(value?: string | null) {
    if (!value) {
        return "";
    }

    const date = new Date(value);

    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);

    return local.toISOString().slice(0, 16);
}

const inputClass =
    "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

const primaryButton =
    "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white disabled:opacity-50";

const secondaryButton =
    "inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600";

const iconButton =
    "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600";
