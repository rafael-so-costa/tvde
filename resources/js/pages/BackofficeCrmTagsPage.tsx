import axios from "axios";
import {
    LoaderCircle,
    Pencil,
    Plus,
    Tag,
    Trash2,
    X,
} from "lucide-react";
import {
    useState,
} from "react";
import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";

import api from "../lib/api";

import type {
    BackofficeCrmTag,
    BackofficeCrmTagListResponse,
} from "../types/backofficeCrmCommercial";

export default function BackofficeCrmTagsPage() {
    const queryClient =
        useQueryClient();

    const [editingId, setEditingId] =
        useState<string | null>(
            null,
        );

    const [name, setName] =
        useState("");

    const [color, setColor] =
        useState("");

    const [description, setDescription] =
        useState("");

    const tagsQuery =
        useQuery({
            queryKey: [
                "backoffice",
                "crm",
                "tags",
            ],

            queryFn: async () => {
                const response =
                    await api.get(
                        "/api/backoffice/crm/tags",
                    );

                return response
                    .data as BackofficeCrmTagListResponse;
            },
        });

    const saveMutation =
        useMutation({
            mutationFn: async () => {
                if (editingId) {
                    return api.patch(
                        `/api/backoffice/crm/tags/${editingId}`,
                        {
                            name,
                            color:
                                color ||
                                null,

                            description:
                                description ||
                                null,
                        },
                    );
                }

                return api.post(
                    "/api/backoffice/crm/tags",
                    {
                        name,
                        color:
                            color ||
                            null,

                        description:
                            description ||
                            null,
                    },
                );
            },

            onSuccess: async () => {
                resetForm();

                await queryClient.invalidateQueries({
                    queryKey: [
                        "backoffice",
                        "crm",
                        "tags",
                    ],
                });
            },
        });

    const toggleMutation =
        useMutation({
            mutationFn: async (
                tag: BackofficeCrmTag,
            ) =>
                api.patch(
                    `/api/backoffice/crm/tags/${tag.id}`,
                    {
                        is_active:
                            !tag.is_active,
                    },
                ),

            onSuccess: async () => {
                await queryClient.invalidateQueries({
                    queryKey: [
                        "backoffice",
                        "crm",
                        "tags",
                    ],
                });
            },
        });

    const deleteMutation =
        useMutation({
            mutationFn: async (
                id: string,
            ) =>
                api.delete(
                    `/api/backoffice/crm/tags/${id}`,
                ),

            onSuccess: async () => {
                await queryClient.invalidateQueries({
                    queryKey: [
                        "backoffice",
                        "crm",
                        "tags",
                    ],
                });
            },
        });

    function edit(
        tag: BackofficeCrmTag,
    ): void {
        setEditingId(
            tag.id,
        );

        setName(
            tag.name,
        );

        setColor(
            tag.color ?? "",
        );

        setDescription(
            tag.description ??
                "",
        );
    }

    function resetForm(): void {
        setEditingId(
            null,
        );

        setName("");
        setColor("");
        setDescription("");
    }

    return (
        <div className="mx-auto max-w-6xl space-y-7">
            <section>
                <p className="mb-2 text-sm font-medium text-indigo-600">
                    CRM · Configuração
                </p>

                <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                    Tags
                </h1>

                <p className="mt-2 text-slate-500">
                    Segmentação comercial dos leads e prospects.
                </p>
            </section>

            <section className="grid gap-5 lg:grid-cols-[360px_1fr]">
                <form
                    onSubmit={(event) => {
                        event.preventDefault();

                        saveMutation.mutate();
                    }}
                    className="h-fit rounded-2xl border border-slate-200 bg-white p-5"
                >
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-slate-900">
                            {editingId
                                ? "Editar tag"
                                : "Nova tag"}
                        </h2>

                        {editingId && (
                            <button
                                type="button"
                                onClick={
                                    resetForm
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    <div className="mt-5 space-y-4">
                        <div>
                            <label className={labelClass}>
                                Nome *
                            </label>

                            <input
                                value={
                                    name
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setName(
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                className={inputClass}
                            />
                        </div>

                        <div>
                            <label className={labelClass}>
                                Cor
                            </label>

                            <input
                                value={
                                    color
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setColor(
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                placeholder="Ex.: indigo"
                                className={inputClass}
                            />
                        </div>

                        <div>
                            <label className={labelClass}>
                                Descrição
                            </label>

                            <textarea
                                value={
                                    description
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setDescription(
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={
                                !name.trim() ||
                                saveMutation.isPending
                            }
                            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
                        >
                            {saveMutation.isPending ? (
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                            ) : (
                                <Plus className="h-4 w-4" />
                            )}

                            {editingId
                                ? "Guardar alterações"
                                : "Criar tag"}
                        </button>

                        {saveMutation.isError && (
                            <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                                {errorMessage(
                                    saveMutation.error,
                                )}
                            </div>
                        )}
                    </div>
                </form>

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    {tagsQuery.isLoading ? (
                        <div className="flex min-h-72 items-center justify-center">
                            <LoaderCircle className="h-7 w-7 animate-spin text-indigo-600" />
                        </div>
                    ) : tagsQuery.data?.data.length ===
                      0 ? (
                        <div className="px-6 py-16 text-center">
                            <Tag className="mx-auto h-10 w-10 text-slate-300" />

                            <p className="mt-4 text-sm text-slate-500">
                                Nenhuma tag criada.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {tagsQuery.data?.data.map(
                                (
                                    tag,
                                ) => (
                                    <div
                                        key={
                                            tag.id
                                        }
                                        className="flex flex-col justify-between gap-4 px-5 py-4 sm:flex-row sm:items-center"
                                    >
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-slate-900">
                                                    {
                                                        tag.name
                                                    }
                                                </span>

                                                <span
                                                    className={[
                                                        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                                        tag.is_active
                                                            ? "bg-emerald-50 text-emerald-700"
                                                            : "bg-slate-100 text-slate-500",
                                                    ].join(
                                                        " ",
                                                    )}
                                                >
                                                    {tag.is_active
                                                        ? "Ativa"
                                                        : "Inativa"}
                                                </span>
                                            </div>

                                            <div className="mt-1 text-xs text-slate-400">
                                                {tag.leads_count ??
                                                    0}{" "}
                                                lead(s)
                                            </div>

                                            {tag.description && (
                                                <div className="mt-2 text-sm text-slate-500">
                                                    {
                                                        tag.description
                                                    }
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    toggleMutation.mutate(
                                                        tag,
                                                    )
                                                }
                                                className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600"
                                            >
                                                {tag.is_active
                                                    ? "Desativar"
                                                    : "Ativar"}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    edit(
                                                        tag,
                                                    )
                                                }
                                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (
                                                        window.confirm(
                                                            "Eliminar esta tag? Se estiver em utilização será apenas desativada.",
                                                        )
                                                    ) {
                                                        deleteMutation.mutate(
                                                            tag.id,
                                                        );
                                                    }
                                                }}
                                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 text-red-500"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ),
                            )}
                        </div>
                    )}
                </div>
            </section>
        </div>
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
        return (
            error.response?.data
                ?.message ??
            "Não foi possível guardar a tag."
        );
    }

    return "Não foi possível guardar a tag.";
}

const labelClass =
    "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500";

const inputClass =
    "h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500";
