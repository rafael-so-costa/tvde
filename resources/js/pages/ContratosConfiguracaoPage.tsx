import axios from "axios";
import {
    useMemo,
    useState,
} from "react";
import {
    useMutation,
    useQueryClient,
} from "@tanstack/react-query";
import {
    AlertCircle,
    Archive,
    FileCog,
    FileStack,
    LoaderCircle,
    Pencil,
    Plus,
    RefreshCw,
    Search,
    Settings2,
    Workflow,
} from "lucide-react";
import {
    useNavigate,
} from "react-router-dom";
import api from "../lib/api";
import {
    useTenant,
} from "../contexts/TenantContext";
import {
    useContractTypes,
} from "../hooks/useContractTypes";
import {
    useCurrentPermissions,
} from "../hooks/useCurrentPermissions";
import type {
    TipoContrato,
} from "../types/tipo-contrato";

function errorMessage(
    error: unknown,
    fallback: string,
): string {
    if (
        axios.isAxiosError(error)
    ) {
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
                )
                    .flat()
                    .find(
                        (value) =>
                            typeof value ===
                            "string",
                    );

            if (
                typeof first ===
                "string"
            ) {
                return first;
            }
        }

        return (
            error.response?.data
                ?.message ??
            fallback
        );
    }

    return fallback;
}

export default function ContratosConfiguracaoPage() {
    const {
        tenant,
    } = useTenant();

    const navigate =
        useNavigate();

    const queryClient =
        useQueryClient();

    const {
        can,
    } =
        useCurrentPermissions();

    const [
        search,
        setSearch,
    ] =
        useState("");

    const [
        showInactive,
        setShowInactive,
    ] =
        useState(true);

    const [
        error,
        setError,
    ] =
        useState<string | null>(
            null,
        );

    const [
        archivingId,
        setArchivingId,
    ] =
        useState<string | null>(
            null,
        );

    const typesQuery =
        useContractTypes({
            includeInactive:
                true,
        });

    const canConfigure =
        can(
            "contratos",
            "configurar",
        );

    const archiveMutation =
        useMutation({
            mutationFn:
                async (
                    id: string,
                ) => {
                    const response =
                        await api.post(
                            `/api/tipos-contrato/${id}/arquivar`,
                        );

                    return response
                        .data
                        .data as TipoContrato;
                },

            onMutate:
                (
                    id,
                ) => {
                    setError(
                        null,
                    );

                    setArchivingId(
                        id,
                    );
                },

            onSuccess:
                async () => {
                    await queryClient
                        .invalidateQueries({
                            queryKey: [
                                "tipos-contrato",
                            ],
                        });
                },

            onError:
                (
                    mutationError,
                ) => {
                    setError(
                        errorMessage(
                            mutationError,
                            "Não foi possível arquivar o tipo de contrato.",
                        ),
                    );
                },

            onSettled:
                () => {
                    setArchivingId(
                        null,
                    );
                },
        });

    const types =
        useMemo(() => {
            const term =
                search
                    .trim()
                    .toLocaleLowerCase(
                        "pt-PT",
                    );

            return (
                typesQuery.data ??
                []
            )
                .filter(
                    (item) =>
                        showInactive ||
                        item.ativo,
                )
                .filter(
                    (item) => {
                        if (!term) {
                            return true;
                        }

                        return [
                            item.nome,
                            item.codigo,
                            item.slug,
                            item.descricao,
                            item.template
                                ?.nome,
                            item
                                .checklist_process_template
                                ?.nome,
                        ]
                            .filter(
                                Boolean,
                            )
                            .some(
                                (
                                    value,
                                ) =>
                                    String(
                                        value,
                                    )
                                        .toLocaleLowerCase(
                                            "pt-PT",
                                        )
                                        .includes(
                                            term,
                                        ),
                            );
                    },
                );
        }, [
            typesQuery.data,
            search,
            showInactive,
        ]);

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
                            Escolha uma organização antes de configurar
                            os tipos de contrato.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const all =
        typesQuery.data ??
        [];

    const activeCount =
        all.filter(
            (item) =>
                item.ativo,
        ).length;

    const menuCount =
        all.filter(
            (item) =>
                item.ativo &&
                item.mostrar_menu,
        ).length;

    const configuredCount =
        all.filter(
            (item) =>
                Boolean(
                    item.template_id ||
                        item
                            .checklist_process_template_id,
                ),
        ).length;

    async function refresh() {
        setError(
            null,
        );

        await typesQuery.refetch();
    }

    function requestArchive(
        item: TipoContrato,
    ) {
        if (
            !canConfigure ||
            !item.ativo
        ) {
            return;
        }

        const confirmed =
            window.confirm(
                `Arquivar "${item.nome}"?\n\nO tipo deixará de aparecer na criação de novos contratos, mas os contratos históricos continuarão preservados.`,
            );

        if (!confirmed) {
            return;
        }

        archiveMutation.mutate(
            item.id,
        );
    }

    return (
        <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="mb-2 text-sm font-medium text-indigo-600">
                        Contratos
                    </p>

                    <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                        Configuração de contratos
                    </h1>

                    <p className="mt-2 max-w-3xl text-slate-500">
                        Configure os tipos de contrato, documentos,
                        workflows, entidades, campos e assinaturas
                        disponíveis para{" "}
                        <span className="font-medium text-slate-700">
                            {tenant.nome}
                        </span>
                        .
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() =>
                            navigate(
                                "/templates",
                            )
                        }
                        className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                        <FileStack className="h-4 w-4" />

                        Templates e workflows
                    </button>

                    {canConfigure && (
                        <button
                            type="button"
                            onClick={() =>
                                navigate(
                                    "/contratos/configuracao/novo",
                                )
                            }
                            className="inline-flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-700"
                        >
                            <Plus className="h-4 w-4" />

                            Novo tipo
                        </button>
                    )}
                </div>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Stat
                    label="Tipos"
                    value={
                        all.length
                    }
                />

                <Stat
                    label="Ativos"
                    value={
                        activeCount
                    }
                />

                <Stat
                    label="No menu"
                    value={
                        menuCount
                    }
                />

                <Stat
                    label="Configurados"
                    value={
                        configuredCount
                    }
                />
            </div>

            {error && (
                <div className="mb-6 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <AlertCircle className="h-5 w-5 shrink-0" />

                    {error}
                </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="grid gap-3 border-b border-slate-200 p-5 lg:grid-cols-[1fr_auto_auto] lg:items-center">
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                            value={
                                search
                            }
                            onChange={(
                                event,
                            ) =>
                                setSearch(
                                    event
                                        .target
                                        .value,
                                )
                            }
                            placeholder="Pesquisar nome, código, template ou workflow..."
                            className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                        />
                    </div>

                    <label className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-600">
                        <input
                            type="checkbox"
                            checked={
                                showInactive
                            }
                            onChange={(
                                event,
                            ) =>
                                setShowInactive(
                                    event
                                        .target
                                        .checked,
                                )
                            }
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                        />

                        Mostrar arquivados
                    </label>

                    <button
                        type="button"
                        onClick={
                            refresh
                        }
                        disabled={
                            typesQuery.isFetching
                        }
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 disabled:opacity-50"
                    >
                        <RefreshCw
                            className={[
                                "h-4 w-4",
                                typesQuery.isFetching
                                    ? "animate-spin"
                                    : "",
                            ].join(
                                " ",
                            )}
                        />

                        Atualizar
                    </button>
                </div>

                {typesQuery.isLoading ? (
                    <div className="flex justify-center py-20">
                        <LoaderCircle className="h-8 w-8 animate-spin text-indigo-600" />
                    </div>
                ) : typesQuery.isError ? (
                    <div className="px-6 py-16 text-center">
                        <AlertCircle className="mx-auto h-10 w-10 text-red-500" />

                        <h3 className="mt-3 font-semibold text-slate-900">
                            Não foi possível carregar os tipos de contrato
                        </h3>

                        <button
                            type="button"
                            onClick={
                                refresh
                            }
                            className="mt-5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
                        >
                            Tentar novamente
                        </button>
                    </div>
                ) : types.length ===
                  0 ? (
                    <div className="px-6 py-20 text-center">
                        <FileCog className="mx-auto h-12 w-12 text-indigo-400" />

                        <h3 className="mt-4 font-semibold text-slate-900">
                            Nenhum tipo de contrato encontrado
                        </h3>

                        <p className="mt-2 text-sm text-slate-500">
                            Crie um tipo para definir como os novos
                            contratos devem funcionar.
                        </p>

                        {canConfigure && (
                            <button
                                type="button"
                                onClick={() =>
                                    navigate(
                                        "/contratos/configuracao/novo",
                                    )
                                }
                                className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white"
                            >
                                <Plus className="h-4 w-4" />

                                Criar tipo
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b border-slate-200 bg-slate-50">
                                <tr>
                                    <Th>
                                        Tipo
                                    </Th>

                                    <Th>
                                        Documento
                                    </Th>

                                    <Th>
                                        Workflow
                                    </Th>

                                    <Th>
                                        Contratos
                                    </Th>

                                    <Th>
                                        Estado
                                    </Th>

                                    <Th>
                                        Menu
                                    </Th>

                                    <Th>
                                        Ações
                                    </Th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {types.map(
                                    (
                                        item,
                                    ) => (
                                        <tr
                                            key={
                                                item.id
                                            }
                                            className={[
                                                "transition hover:bg-slate-50",
                                                !item.ativo
                                                    ? "bg-slate-50/70"
                                                    : "",
                                            ].join(
                                                " ",
                                            )}
                                        >
                                            <td className="px-5 py-4">
                                                <div className="font-semibold text-slate-900">
                                                    {
                                                        item.nome
                                                    }
                                                </div>

                                                <div className="mt-1 font-mono text-xs text-slate-400">
                                                    {
                                                        item.codigo
                                                    }
                                                </div>

                                                {item.descricao && (
                                                    <div className="mt-2 max-w-sm text-xs text-slate-500">
                                                        {
                                                            item.descricao
                                                        }
                                                    </div>
                                                )}
                                            </td>

                                            <td className="px-5 py-4">
                                                {item.template ? (
                                                    <div className="flex items-center gap-2 text-sm text-slate-700">
                                                        <FileStack className="h-4 w-4 shrink-0 text-indigo-500" />

                                                        <span>
                                                            {
                                                                item
                                                                    .template
                                                                    .nome
                                                            }
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-slate-400">
                                                        Sem template
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-5 py-4">
                                                {item
                                                    .checklist_process_template ? (
                                                    <div className="flex items-center gap-2 text-sm text-slate-700">
                                                        <Workflow className="h-4 w-4 shrink-0 text-indigo-500" />

                                                        <div>
                                                            <div>
                                                                {
                                                                    item
                                                                        .checklist_process_template
                                                                        .nome
                                                                }
                                                            </div>

                                                            <div className="mt-0.5 text-xs text-slate-400">
                                                                v
                                                                {
                                                                    item
                                                                        .checklist_process_template
                                                                        .versao
                                                                }
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-slate-400">
                                                        Sem workflow
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-5 py-4 text-sm font-medium text-slate-700">
                                                {
                                                    item.contratos_count ??
                                                    0
                                                }
                                            </td>

                                            <td className="px-5 py-4">
                                                <StatusBadge
                                                    active={
                                                        item.ativo
                                                    }
                                                />
                                            </td>

                                            <td className="px-5 py-4">
                                                {item.ativo &&
                                                item.mostrar_menu ? (
                                                    <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                                                        Visível
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                                                        Oculto
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            navigate(
                                                                `/contratos/configuracao/${item.id}`,
                                                            )
                                                        }
                                                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                                                    >
                                                        <Pencil className="h-4 w-4" />

                                                        {canConfigure
                                                            ? "Editar"
                                                            : "Ver"}
                                                    </button>

                                                    {canConfigure &&
                                                        item.ativo && (
                                                            <button
                                                                type="button"
                                                                disabled={
                                                                    archivingId ===
                                                                    item.id
                                                                }
                                                                onClick={() =>
                                                                    requestArchive(
                                                                        item,
                                                                    )
                                                                }
                                                                className="inline-flex h-9 items-center gap-2 rounded-lg bg-red-50 px-3 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                                                            >
                                                                {archivingId ===
                                                                item.id ? (
                                                                    <LoaderCircle className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <Archive className="h-4 w-4" />
                                                                )}

                                                                Arquivar
                                                            </button>
                                                        )}
                                                </div>
                                            </td>
                                        </tr>
                                    ),
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
                <div className="flex gap-3">
                    <Settings2 className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />

                    <div>
                        <h3 className="font-semibold text-indigo-950">
                            Como funciona
                        </h3>

                        <p className="mt-1 text-sm leading-6 text-indigo-800">
                            O tipo de contrato é a configuração principal.
                            Ele determina o template documental, o workflow,
                            as entidades necessárias, os campos, as
                            assinaturas e as regras operacionais. Alterações
                            feitas aqui não modificam os snapshots dos
                            processos já iniciados.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Stat({
    label,
    value,
}: {
    label: string;
    value: number;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">
                {label}
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-950">
                {value}
            </p>
        </div>
    );
}

function StatusBadge({
    active,
}: {
    active: boolean;
}) {
    return (
        <span
            className={[
                "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                active
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-500",
            ].join(
                " ",
            )}
        >
            {active
                ? "Ativo"
                : "Arquivado"}
        </span>
    );
}

function Th({
    children,
}: {
    children: string;
}) {
    return (
        <th className="whitespace-nowrap px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
            {children}
        </th>
    );
}
