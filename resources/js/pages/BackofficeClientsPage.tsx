import {
    Building2,
    ChevronLeft,
    ChevronRight,
    Eye,
    LoaderCircle,
    Search,
    UsersRound,
} from "lucide-react";
import {
    useDeferredValue,
    useState,
} from "react";
import {
    useQuery,
} from "@tanstack/react-query";
import {
    Link,
} from "react-router-dom";

import api from "../lib/api";

import type {
    BackofficeClientListResponse,
} from "../types/backoffice";

export default function BackofficeClientsPage() {
    const [
        search,
        setSearch,
    ] = useState("");

    const [
        status,
        setStatus,
    ] = useState("");

    const [
        onboarding,
        setOnboarding,
    ] = useState("");

    const [
        page,
        setPage,
    ] = useState(1);

    const deferredSearch =
        useDeferredValue(
            search
        );

    const clientsQuery =
        useQuery({
            queryKey: [
                "backoffice",
                "clientes",
                deferredSearch,
                status,
                onboarding,
                page,
            ],

            queryFn: async () => {
                const response =
                    await api.get(
                        "/api/backoffice/clientes",
                        {
                            params: {
                                search:
                                    deferredSearch ||
                                    undefined,

                                status:
                                    status ||
                                    undefined,

                                onboarding:
                                    onboarding ||
                                    undefined,

                                page,

                                per_page:
                                    20,
                            },
                        }
                    );

                return response
                    .data as BackofficeClientListResponse;
            },
        });

    const clients =
        clientsQuery
            .data
            ?.data ??
        [];

    const meta =
        clientsQuery
            .data
            ?.meta;

    function resetPage(): void {
        setPage(
            1
        );
    }

    return (
        <div className="mx-auto max-w-7xl space-y-7">
            <section>
                <p className="mb-2 text-sm font-medium text-indigo-600">
                    Gestão SaaS
                </p>

                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                            Clientes
                        </h1>

                        <p className="mt-2 text-slate-500">
                            Organizações registadas na plataforma FrotaPRO.
                        </p>
                    </div>

                    {meta && (
                        <div className="text-sm text-slate-500">
                            <span className="font-semibold text-slate-900">
                                {meta.total}
                            </span>{" "}
                            clientes
                        </div>
                    )}
                </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <div className="grid gap-3 lg:grid-cols-[1fr_180px_200px]">
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                            value={
                                search
                            }
                            onChange={(
                                event
                            ) => {
                                setSearch(
                                    event
                                        .target
                                        .value
                                );

                                resetPage();
                            }}
                            placeholder="Pesquisar nome, NIF, e-mail..."
                            className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                        />
                    </div>

                    <select
                        value={
                            status
                        }
                        onChange={(
                            event
                        ) => {
                            setStatus(
                                event
                                    .target
                                    .value
                            );

                            resetPage();
                        }}
                        className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-500"
                    >
                        <option value="">
                            Todos os estados
                        </option>

                        <option value="ativo">
                            Ativos
                        </option>

                        <option value="inativo">
                            Inativos
                        </option>
                    </select>

                    <select
                        value={
                            onboarding
                        }
                        onChange={(
                            event
                        ) => {
                            setOnboarding(
                                event
                                    .target
                                    .value
                            );

                            resetPage();
                        }}
                        className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-500"
                    >
                        <option value="">
                            Todo onboarding
                        </option>

                        <option value="pendente">
                            Onboarding pendente
                        </option>

                        <option value="concluido">
                            Onboarding concluído
                        </option>
                    </select>
                </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {clientsQuery
                    .isLoading ? (
                    <div className="flex min-h-64 items-center justify-center">
                        <LoaderCircle className="h-7 w-7 animate-spin text-indigo-600" />
                    </div>
                ) : clientsQuery
                      .isError ? (
                    <div className="px-6 py-16 text-center text-sm text-red-600">
                        Não foi possível carregar os clientes.
                    </div>
                ) : clients.length ===
                  0 ? (
                    <div className="px-6 py-16 text-center">
                        <Building2 className="mx-auto h-10 w-10 text-slate-300" />

                        <h2 className="mt-4 font-semibold text-slate-900">
                            Nenhum cliente encontrado
                        </h2>

                        <p className="mt-2 text-sm text-slate-500">
                            Ajuste os filtros ou a pesquisa.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b border-slate-200 bg-slate-50">
                                <tr>
                                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Cliente
                                    </th>

                                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Estado
                                    </th>

                                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Utilização
                                    </th>

                                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Onboarding
                                    </th>

                                    <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Ações
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {clients.map(
                                    client => (
                                        <tr
                                            key={
                                                client.id
                                            }
                                            className="transition hover:bg-slate-50/70"
                                        >
                                            <td className="px-5 py-4">
                                                <div className="font-semibold text-slate-900">
                                                    {
                                                        client.nome
                                                    }
                                                </div>

                                                <div className="mt-1 text-xs text-slate-400">
                                                    {client.nif
                                                        ? `NIF ${client.nif}`
                                                        : client.email ??
                                                          client.slug}
                                                </div>
                                            </td>

                                            <td className="px-5 py-4">
                                                <span
                                                    className={[
                                                        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                                                        client.ativo
                                                            ? "bg-emerald-50 text-emerald-700"
                                                            : "bg-red-50 text-red-700",
                                                    ].join(
                                                        " "
                                                    )}
                                                >
                                                    {client.ativo
                                                        ? "Ativo"
                                                        : "Inativo"}
                                                </span>
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                                    <UsersRound className="h-4 w-4 text-slate-400" />

                                                    {
                                                        client.users_count
                                                    }{" "}
                                                    utilizadores
                                                </div>

                                                <div className="mt-1 text-xs text-slate-400">
                                                    {
                                                        client.veiculos_count
                                                    }{" "}
                                                    veículos ·{" "}
                                                    {
                                                        client.motoristas_count
                                                    }{" "}
                                                    motoristas
                                                </div>
                                            </td>

                                            <td className="px-5 py-4">
                                                {client.onboarding_required ? (
                                                    <span className="text-sm font-medium text-amber-600">
                                                        Pendente
                                                    </span>
                                                ) : (
                                                    <span className="text-sm font-medium text-emerald-600">
                                                        Concluído
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex justify-end">
                                                    <Link
                                                        to={`/backoffice/clientes/${client.id}`}
                                                        className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                        Ver
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    )
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
                                {meta.total}
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    disabled={
                                        meta.current_page <=
                                        1
                                    }
                                    onClick={() =>
                                        setPage(
                                            current =>
                                                Math.max(
                                                    1,
                                                    current -
                                                        1
                                                )
                                        )
                                    }
                                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>

                                <span className="text-sm font-medium text-slate-600">
                                    {
                                        meta.current_page
                                    }{" "}
                                    /{" "}
                                    {
                                        meta.last_page
                                    }
                                </span>

                                <button
                                    type="button"
                                    disabled={
                                        meta.current_page >=
                                        meta.last_page
                                    }
                                    onClick={() =>
                                        setPage(
                                            current =>
                                                current +
                                                1
                                        )
                                    }
                                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}
            </section>
        </div>
    );
}
