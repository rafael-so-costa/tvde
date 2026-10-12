import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";

import {
    useSearchParams,
} from "react-router-dom";
import {
    AlertCircle,
    Building2,
    LoaderCircle,
    Mail,
    MapPin,
    Pencil,
    Phone,
    Plus,
    RefreshCw,
    Search,
    Trash2,
} from "lucide-react";

import EmpresaFormModal from "../components/empresas/EmpresaFormModal";
import { useTenant } from "../contexts/TenantContext";
import api from "../lib/api";

import type {
    Empresa,
    EmpresaListResponse,
    EmpresaPayload,
    EmpresaStatus,
} from "../types/empresa";

const statusLabels: Record<
    EmpresaStatus,
    string
> = {
    pendente: "Pendente",
    ativo: "Ativo",
    incompleto: "Incompleto",
    inativo: "Inativo",
};

const statusClasses: Record<
    EmpresaStatus,
    string
> = {
    pendente:
        "bg-amber-50 text-amber-700 ring-amber-600/20",
    ativo:
        "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    incompleto:
        "bg-orange-50 text-orange-700 ring-orange-600/20",
    inativo:
        "bg-slate-100 text-slate-600 ring-slate-500/20",
};

function errorMessage(
    error: unknown
): string {
    if (
        axios.isAxiosError(
            error
        )
    ) {
        return (
            error.response?.data
                ?.message ??
            "Não foi possível carregar as empresas."
        );
    }

    return "Não foi possível carregar as empresas.";
}

export default function EmpresasPage() {
    const {
        tenant,
    } = useTenant();

    const queryClient =
        useQueryClient();

    const [
        search,
        setSearch,
    ] = useState("");

    const [
        formOpen,
        setFormOpen,
    ] = useState(false);

    const [
        editing,
        setEditing,
    ] = useState<Empresa | null>(
        null
    );

    const [
        deleting,
        setDeleting,
    ] = useState<Empresa | null>(
        null
    );

    const [
        searchParams,
        setSearchParams,
    ]=useSearchParams();

    useEffect(()=>{
        const query=
            searchParams.get(
                "q"
            );

        if(query){
            setSearch(
                query
            );
        }

        if(
            searchParams.get(
                "novo"
            ) ===
            "1"
        ){
            setEditing(null);
            setFormOpen(true);

            const next=
                new URLSearchParams(
                    searchParams
                );

            next.delete(
                "novo"
            );

            setSearchParams(
                next,
                {
                    replace:true,
                }
            );
        }
    },[
        searchParams,
        setSearchParams,
    ]);

    const empresasQuery =
        useQuery({
            queryKey: [
                "empresas",
                tenant?.id,
            ],

            enabled: Boolean(
                tenant?.id
            ),

            queryFn: async () => {
                const response =
                    await api.get(
                        "/api/empresas"
                    );

                return response
                    .data as EmpresaListResponse;
            },
        });

    const createMutation =
        useMutation({
            mutationFn: async (
                payload: EmpresaPayload
            ) => {
                const response =
                    await api.post(
                        "/api/empresas",
                        payload
                    );

                return response
                    .data
                    .data as Empresa;
            },
        });

    const updateMutation =
        useMutation({
            mutationFn: async ({
                id,
                payload,
            }: {
                id: string;
                payload: EmpresaPayload;
            }) => {
                const response =
                    await api.patch(
                        `/api/empresas/${id}`,
                        payload
                    );

                return response
                    .data
                    .data as Empresa;
            },
        });

    const deleteMutation =
        useMutation({
            mutationFn: async (
                id: string
            ) => {
                await api.delete(
                    `/api/empresas/${id}`
                );
            },

            onSuccess: async () => {
                await queryClient
                    .invalidateQueries({
                        queryKey: [
                            "empresas",
                            tenant?.id,
                        ],
                    });

                setDeleting(
                    null
                );
            },
        });

    const empresas =
        useMemo(() => {
            const data =
                empresasQuery
                    .data
                    ?.data ??
                [];

            const term =
                search
                    .trim()
                    .toLocaleLowerCase(
                        "pt-PT"
                    );

            if (!term) {
                return data;
            }

            return data.filter(
                (empresa) =>
                    [
                        empresa
                            .nome_empresa,

                        empresa.nif,

                        empresa.email,

                        empresa
                            .nome_gerente,

                        empresa
                            .endereco_cidade,
                    ]
                        .filter(
                            Boolean
                        )
                        .some(
                            (
                                value
                            ) =>
                                String(
                                    value
                                )
                                    .toLocaleLowerCase(
                                        "pt-PT"
                                    )
                                    .includes(
                                        term
                                    )
                        )
            );
        }, [
            empresasQuery
                .data
                ?.data,
            search,
        ]);

    const empresaMeta =
        empresasQuery
            .data
            ?.meta;

    const canCreate =
        empresaMeta
            ?.can_create ??
        false;

    const canDelete =
        empresaMeta
            ?.can_delete ??
        false;

    const total =
        empresasQuery
            .data
            ?.data
            .length ??
        0;

    const activeCount =
        empresasQuery
            .data
            ?.data
            .filter(
                (empresa) =>
                    empresa.ativo
            )
            .length ??
        0;

    const pendingCount =
        empresasQuery
            .data
            ?.data
            .filter(
                (empresa) =>
                    empresa
                        .status_cadastro ===
                    "pendente"
            )
            .length ??
        0;

    const incompleteCount =
        empresasQuery
            .data
            ?.data
            .filter(
                (empresa) =>
                    empresa
                        .status_cadastro ===
                    "incompleto"
            )
            .length ??
        0;

    function openCreate() {
        if (!canCreate) {
            return;
        }

        setEditing(
            null
        );

        setFormOpen(
            true
        );
    }

    function openEdit(
        empresa: Empresa
    ) {
        setEditing(
            empresa
        );

        setFormOpen(
            true
        );
    }

    async function handleSave(
        payload: EmpresaPayload
    ) {
        if (editing) {
            await updateMutation
                .mutateAsync({
                    id:
                        editing.id,

                    payload,
                });
        } else {
            if (!canCreate) {
                return;
            }

            await createMutation
                .mutateAsync(
                    payload
                );
        }

        await queryClient
            .invalidateQueries({
                queryKey: [
                    "empresas",
                    tenant?.id,
                ],
            });

        await queryClient
            .invalidateQueries({
                queryKey: [
                    "dashboard",
                    tenant?.id,
                ],
            });

        setFormOpen(
            false
        );

        setEditing(
            null
        );
    }

    if (!tenant) {
        return (
            <div className="mx-auto max-w-7xl">
                <div className="flex gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-6">
                    <AlertCircle className="h-6 w-6 shrink-0 text-amber-600" />

                    <div>
                        <h1 className="font-semibold text-amber-900">
                            Selecione uma organização
                        </h1>

                        <p className="mt-1 text-sm text-amber-700">
                            Escolha uma organização no topo do painel antes de aceder às empresas.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="mb-2 text-sm font-medium text-indigo-600">
                        Organização
                    </p>

                    <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                        Empresas
                    </h1>

                    <p className="mt-2 text-slate-500">
                        Empresas cadastradas em{" "}
                        <span className="font-medium text-slate-700">
                            {tenant.nome}
                        </span>
                        .
                    </p>
                </div>

                {canCreate && (
                    <button
                        type="button"
                        onClick={
                            openCreate
                        }
                        className="flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700"
                    >
                        <Plus className="h-5 w-5" />

                        Nova empresa
                    </button>
                )}
            </div>

            {!canCreate &&
                empresaMeta &&
                !empresaMeta
                    .multi_company_enabled && (
                    <div className="mb-6 flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 px-5 py-4">
                        <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />

                        <div>
                            <p className="text-sm font-semibold text-indigo-950">
                                Empresa principal
                            </p>

                            <p className="mt-1 text-sm leading-6 text-indigo-700">
                                Esta organização está configurada para operar com uma única empresa. Pode atualizar os dados da empresa principal sempre que necessário.
                            </p>
                        </div>
                    </div>
                )}

            <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <p className="text-sm text-slate-500">
                        Total
                    </p>

                    <p className="mt-2 text-2xl font-bold text-slate-950">
                        {total}
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <p className="text-sm text-slate-500">
                        Ativas
                    </p>

                    <p className="mt-2 text-2xl font-bold text-emerald-600">
                        {activeCount}
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <p className="text-sm text-slate-500">
                        Pendentes
                    </p>

                    <p className="mt-2 text-2xl font-bold text-amber-600">
                        {pendingCount}
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <p className="text-sm text-slate-500">
                        Incompletas
                    </p>

                    <p className="mt-2 text-2xl font-bold text-orange-600">
                        {incompleteCount}
                    </p>
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <div className="relative w-full sm:max-w-sm">
                        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                            value={
                                search
                            }
                            onChange={(
                                event
                            ) =>
                                setSearch(
                                    event
                                        .target
                                        .value
                                )
                            }
                            placeholder="Pesquisar empresa, NIF, e-mail..."
                            className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            empresasQuery
                                .refetch()
                        }
                        disabled={
                            empresasQuery
                                .isFetching
                        }
                        className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                        <RefreshCw
                            className={[
                                "h-4 w-4",

                                empresasQuery
                                    .isFetching
                                    ? "animate-spin"
                                    : "",
                            ].join(
                                " "
                            )}
                        />

                        Atualizar
                    </button>
                </div>

                {empresasQuery
                    .isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                        <LoaderCircle className="mb-3 h-8 w-8 animate-spin text-indigo-600" />

                        <p className="text-sm">
                            A carregar empresas...
                        </p>
                    </div>
                ) : empresasQuery
                      .isError ? (
                    <div className="px-6 py-16 text-center">
                        <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-500" />

                        <h3 className="font-semibold text-slate-900">
                            Não foi possível carregar as empresas
                        </h3>

                        <p className="mt-2 text-sm text-slate-500">
                            {errorMessage(
                                empresasQuery
                                    .error
                            )}
                        </p>

                        <button
                            type="button"
                            onClick={() =>
                                empresasQuery
                                    .refetch()
                            }
                            className="mt-5 h-10 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white"
                        >
                            Tentar novamente
                        </button>
                    </div>
                ) : empresas.length ===
                  0 ? (
                    <div className="px-6 py-20 text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                            <Building2 className="h-7 w-7" />
                        </div>

                        <h3 className="font-semibold text-slate-900">
                            {search
                                ? "Nenhuma empresa encontrada"
                                : "Ainda não existem empresas"}
                        </h3>

                        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
                            {search
                                ? "Tente pesquisar por outro nome, NIF ou e-mail."
                                : canCreate
                                  ? "Cadastre a primeira empresa desta organização."
                                  : "Não existe uma empresa disponível nesta organização."}
                        </p>

                        {!search &&
                            canCreate && (
                                <button
                                    type="button"
                                    onClick={
                                        openCreate
                                    }
                                    className="mt-5 h-10 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white"
                                >
                                    Criar empresa
                                </button>
                            )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b border-slate-200 bg-slate-50">
                                <tr>
                                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Empresa
                                    </th>

                                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Contacto
                                    </th>

                                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Localização
                                    </th>

                                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Estado
                                    </th>

                                    <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Ações
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {empresas.map(
                                    (
                                        empresa
                                    ) => (
                                        <tr
                                            key={
                                                empresa.id
                                            }
                                            className="transition hover:bg-slate-50/70"
                                        >
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-indigo-50 text-indigo-600">
                                                        {empresa.logo_url ? (
                                                            <img
                                                                src={
                                                                    empresa.logo_url
                                                                }
                                                                alt=""
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : (
                                                            <Building2 className="h-5 w-5" />
                                                        )}
                                                    </div>

                                                    <div>
                                                        <div className="text-sm font-semibold text-slate-900">
                                                            {
                                                                empresa.nome_empresa
                                                            }
                                                        </div>

                                                        <div className="mt-0.5 text-xs text-slate-500">
                                                            NIF{" "}
                                                            {
                                                                empresa.nif
                                                            }
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="space-y-1">
                                                    {empresa.email && (
                                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                                            <Mail className="h-4 w-4 text-slate-400" />

                                                            {
                                                                empresa.email
                                                            }
                                                        </div>
                                                    )}

                                                    {empresa.telemovel && (
                                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                                            <Phone className="h-4 w-4 text-slate-400" />

                                                            {
                                                                empresa.telemovel
                                                            }
                                                        </div>
                                                    )}

                                                    {!empresa.email &&
                                                        !empresa.telemovel && (
                                                            <span className="text-sm text-slate-400">
                                                                —
                                                            </span>
                                                        )}
                                                </div>
                                            </td>

                                            <td className="px-5 py-4">
                                                {empresa.endereco_cidade ? (
                                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                                        <MapPin className="h-4 w-4 text-slate-400" />

                                                        {
                                                            empresa.endereco_cidade
                                                        }
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-slate-400">
                                                        —
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex flex-col items-start gap-1.5">
                                                    <span
                                                        className={[
                                                            "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",

                                                            statusClasses[
                                                                empresa
                                                                    .status_cadastro
                                                            ],
                                                        ].join(
                                                            " "
                                                        )}
                                                    >
                                                        {
                                                            statusLabels[
                                                                empresa
                                                                    .status_cadastro
                                                            ]
                                                        }
                                                    </span>

                                                    {!empresa.ativo && (
                                                        <span className="text-xs text-red-500">
                                                            Desativada
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        title="Editar"
                                                        onClick={() =>
                                                            openEdit(
                                                                empresa
                                                            )
                                                        }
                                                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </button>

                                                    {canDelete && (
                                                        <button
                                                            type="button"
                                                            title="Eliminar"
                                                            onClick={() =>
                                                                setDeleting(
                                                                    empresa
                                                                )
                                                            }
                                                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <EmpresaFormModal
                open={
                    formOpen
                }
                empresa={
                    editing
                }
                onClose={() => {
                    setFormOpen(
                        false
                    );

                    setEditing(
                        null
                    );
                }}
                onSubmit={
                    handleSave
                }
            />

            {deleting &&
                canDelete && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <button
                            type="button"
                            aria-label="Cancelar"
                            onClick={() =>
                                setDeleting(
                                    null
                                )
                            }
                            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
                        />

                        <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
                                <Trash2 className="h-5 w-5" />
                            </div>

                            <h2 className="text-xl font-semibold text-slate-950">
                                Eliminar empresa?
                            </h2>

                            <p className="mt-2 text-sm leading-relaxed text-slate-500">
                                A empresa{" "}
                                <span className="font-semibold text-slate-700">
                                    {
                                        deleting.nome_empresa
                                    }
                                </span>{" "}
                                será removida permanentemente.
                            </p>

                            {deleteMutation
                                .isError && (
                                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                    {errorMessage(
                                        deleteMutation
                                            .error
                                    )}
                                </div>
                            )}

                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    type="button"
                                    disabled={
                                        deleteMutation
                                            .isPending
                                    }
                                    onClick={() =>
                                        setDeleting(
                                            null
                                        )
                                    }
                                    className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="button"
                                    disabled={
                                        deleteMutation
                                            .isPending
                                    }
                                    onClick={() =>
                                        deleteMutation
                                            .mutate(
                                                deleting.id
                                            )
                                    }
                                    className="flex h-10 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                                >
                                    {deleteMutation
                                        .isPending && (
                                        <LoaderCircle className="h-4 w-4 animate-spin" />
                                    )}

                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
        </div>
    );
}
