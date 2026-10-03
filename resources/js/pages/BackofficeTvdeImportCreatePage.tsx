import axios from "axios";
import {
    ArrowLeft,
    Database,
    FileUp,
    LoaderCircle,
} from "lucide-react";
import {
    useState,
} from "react";
import {
    useMutation,
    useQueryClient,
} from "@tanstack/react-query";
import {
    Link,
    useNavigate,
} from "react-router-dom";

import api from "../lib/api";

import type {
    BackofficeTvdeImportMutationResponse,
    BackofficeTvdeSource,
} from "../types/backofficeCrm";

export default function BackofficeTvdeImportCreatePage() {
    const navigate =
        useNavigate();

    const queryClient =
        useQueryClient();

    const [
        source,
        setSource,
    ] = useState<BackofficeTvdeSource>(
        "imt_continental",
    );

    const [
        file,
        setFile,
    ] = useState<File | null>(
        null,
    );

    const [
        confirmed,
        setConfirmed,
    ] = useState(
        false,
    );

    const importMutation =
        useMutation({
            mutationFn:
                async () => {
                    if (!file) {
                        throw new Error(
                            "Selecione o PDF.",
                        );
                    }

                    const data =
                        new FormData();

                    data.append(
                        "source",
                        source,
                    );

                    data.append(
                        "file",
                        file,
                    );

                    data.append(
                        "confirm_full_snapshot",
                        confirmed
                            ? "1"
                            : "0",
                    );

                    const response =
                        await api.post(
                            "/api/backoffice/crm/importacoes",
                            data,
                        );

                    return response
                        .data as BackofficeTvdeImportMutationResponse;
                },

            onSuccess:
                async (
                    response,
                ) => {
                    await queryClient.invalidateQueries({
                        queryKey: [
                            "backoffice",
                            "crm",
                            "importacoes",
                        ],
                    });

                    await queryClient.invalidateQueries({
                        queryKey: [
                            "backoffice",
                            "crm",
                            "operadores",
                        ],
                    });

                    await queryClient.invalidateQueries({
                        queryKey: [
                            "backoffice",
                            "crm",
                            "dashboard",
                        ],
                    });

                    navigate(
                        `/backoffice/crm/importacoes/${response.data.id}`,
                    );
                },
        });

    return (
        <div className="mx-auto max-w-3xl space-y-7">
            <section>
                <Link
                    to="/backoffice/crm/importacoes"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Importações TVDE
                </Link>

                <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950">
                    Importar listagem TVDE
                </h1>

                <p className="mt-2 text-slate-500">
                    Carregue o PDF oficial completo disponibilizado pelo IMT ou pela Região Autónoma da Madeira.
                </p>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex items-start gap-4 rounded-2xl bg-indigo-50 p-4">
                    <Database className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />

                    <div className="text-sm leading-6 text-indigo-800">
                        A importação é tratada como um snapshot oficial completo. Operadores existentes na importação anterior que deixem de constar do novo PDF poderão ser marcados como removidos.
                    </div>
                </div>

                <form
                    onSubmit={(
                        event,
                    ) => {
                        event.preventDefault();

                        importMutation.mutate();
                    }}
                    className="mt-6 space-y-5"
                >
                    <div>
                        <label className={labelClass}>
                            Fonte oficial
                        </label>

                        <select
                            value={
                                source
                            }
                            onChange={(
                                event,
                            ) =>
                                setSource(
                                    event
                                        .target
                                        .value as BackofficeTvdeSource,
                                )
                            }
                            className={inputClass}
                        >
                            <option value="imt_continental">
                                IMT — Portugal Continental
                            </option>

                            <option value="ram">
                                RAM — Região Autónoma da Madeira
                            </option>
                        </select>
                    </div>

                    <div>
                        <label className={labelClass}>
                            PDF oficial
                        </label>

                        <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 text-center transition hover:border-indigo-300 hover:bg-indigo-50/40">
                            <FileUp className="h-9 w-9 text-indigo-500" />

                            <div className="mt-3 font-semibold text-slate-800">
                                {file
                                    ? file.name
                                    : "Selecionar PDF"}
                            </div>

                            <div className="mt-1 text-sm text-slate-400">
                                PDF até 100 MB
                            </div>

                            <input
                                type="file"
                                accept=".pdf,application/pdf"
                                className="hidden"
                                onChange={(
                                    event,
                                ) =>
                                    setFile(
                                        event
                                            .target
                                            .files?.[0] ??
                                            null,
                                    )
                                }
                            />
                        </label>
                    </div>

                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                        <input
                            type="checkbox"
                            checked={
                                confirmed
                            }
                            onChange={(
                                event,
                            ) =>
                                setConfirmed(
                                    event
                                        .target
                                        .checked,
                                )
                            }
                            className="mt-1 h-4 w-4 rounded border-amber-300 text-indigo-600"
                        />

                        <span className="text-sm leading-6 text-amber-900">
                            Confirmo que este ficheiro corresponde à listagem oficial completa da fonte selecionada e compreendo que ausências relativamente ao snapshot anterior podem ser interpretadas como remoções.
                        </span>
                    </label>

                    <button
                        type="submit"
                        disabled={
                            importMutation.isPending ||
                            !file ||
                            !confirmed
                        }
                        className="inline-flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {importMutation.isPending ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                            <FileUp className="h-4 w-4" />
                        )}

                        {importMutation.isPending
                            ? "A importar PDF..."
                            : "Importar PDF"}
                    </button>

                    {importMutation.isError && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {errorMessage(
                                importMutation.error,
                            )}
                        </div>
                    )}
                </form>
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
        const message =
            error.response?.data
                ?.message;

        if (
            typeof message ===
            "string"
        ) {
            return message;
        }

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
                )[0];

            if (
                Array.isArray(
                    first,
                )
            ) {
                return String(
                    first[0],
                );
            }
        }
    }

    if (
        error instanceof Error
    ) {
        return error.message;
    }

    return "Não foi possível importar o PDF.";
}

const inputClass =
    "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

const labelClass =
    "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500";
