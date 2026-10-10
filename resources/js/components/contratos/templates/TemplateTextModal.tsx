import axios from "axios";
import {
    useMemo,
    useState,
} from "react";
import {
    AlertCircle,
    ArrowLeft,
    CheckCircle2,
    ClipboardPaste,
    FileSearch,
    LoaderCircle,
    Save,
    Sparkles,
    X,
} from "lucide-react";
import api from "../../../lib/api";
import type {
    PerfilTemplate,
} from "../../../types/template";

type MappingType =
    | "automatico"
    | "manual"
    | "calculado"
    | "assinatura";

type MappingOrigin =
    | "empresa"
    | "motorista"
    | "proprietario"
    | "veiculo"
    | "contrato"
    | "assinatura";

interface SourceCatalogOption {
    value: string;
    label: string;
}

type SourceCatalog =
    Partial<
        Record<
            MappingOrigin,
            SourceCatalogOption[]
        >
    >;

interface AnalysisField {
    name: string;
    label: string;
    type: string;
    required: boolean;
    source_type: MappingType;
    source_path: string | null;
    confidence: number;
    aliases: string[];
    detected_values: string[];
}

interface FieldMapping {
    tipo: MappingType;
    origem: MappingOrigin | null;
    campo: string | null;
    confianca?: number;
    valores_detectados?: string[];
    aliases_detectados?: string[];
}

interface AnalysisWarning {
    code: string;

    severity:
        | "info"
        | "warning"
        | "error";

    message: string;
    field?: string;

    context?: Record<
        string,
        unknown
    >;
}

interface TemplateTextAnalysis {
    conteudo_original: string;

    conteudo_parametrizado:
        string;

    campos_detectados: Array<{
        id: string;
        name: string;
        label: string;
        type: string;
        required: boolean;
    }>;

    campos_mapeados:
        Record<
            string,
            FieldMapping
        >;

    fields:
        AnalysisField[];

    warnings:
        AnalysisWarning[];

    source_catalog:
        SourceCatalog;

    stats: {
        campos: number;
        valores_detectados: number;
        avisos: number;
    };
}

interface EditableMapping {
    tipo:
        MappingType;

    origem:
        MappingOrigin |
        "";

    campo:
        string;
}

const originLabels:
    Record<
        MappingOrigin,
        string
    > = {
        empresa:
            "Empresa",

        motorista:
            "Motorista",

        proprietario:
            "Proprietário",

        veiculo:
            "Veículo",

        contrato:
            "Contrato",

        assinatura:
            "Assinatura",
    };

function errorMessage(
    error: unknown,
    fallback: string,
): string {
    if (
        axios.isAxiosError(
            error,
        )
    ) {
        const errors =
            error.response
                ?.data
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
                        (
                            value,
                        ) =>
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
            error.response
                ?.data
                ?.message ??
            fallback
        );
    }

    return fallback;
}

function confidenceLabel(
    value: number,
): string {
    return `${Math.round(
        value * 100,
    )}%`;
}

export default function TemplateTextModal({
    profiles,
    onClose,
    onSaved,
}: {
    profiles:
        PerfilTemplate[];

    onClose:
        () => void;

    onSaved:
        () => Promise<void>;
}) {
    const [
        name,
        setName,
    ] =
        useState("");

    const [
        profileId,
        setProfileId,
    ] =
        useState("");

    const [
        content,
        setContent,
    ] =
        useState("");

    const [
        analysis,
        setAnalysis,
    ] =
        useState<
            TemplateTextAnalysis |
            null
        >(null);

    const [
        mappings,
        setMappings,
    ] =
        useState<
            Record<
                string,
                EditableMapping
            >
        >({});

    const [
        analyzing,
        setAnalyzing,
    ] =
        useState(false);

    const [
        saving,
        setSaving,
    ] =
        useState(false);

    const [
        error,
        setError,
    ] =
        useState<
            string | null
        >(null);

    const hasBlockingWarnings =
        useMemo(
            () =>
                analysis
                    ?.warnings
                    .some(
                        (
                            warning,
                        ) =>
                            warning
                                .severity ===
                            "error",
                    ) ??
                false,
            [
                analysis,
            ],
        );

    function initializeMappings(
        result:
            TemplateTextAnalysis,
    ) {
        const next:
            Record<
                string,
                EditableMapping
            > = {};

        for (
            const field of
            result.fields
        ) {
            const mapping =
                result
                    .campos_mapeados[
                    field.name
                ];

            next[
                field.name
            ] = {
                tipo:
                    mapping
                        ?.tipo ??
                    field
                        .source_type ??
                    "manual",

                origem:
                    mapping
                        ?.origem ??
                    "",

                campo:
                    mapping
                        ?.campo ??
                    "",
            };
        }

        setMappings(
            next,
        );
    }

    function sourceOptions(
        origin:
            MappingOrigin |
            "",
    ): SourceCatalogOption[] {
        if (
            !analysis ||
            !origin
        ) {
            return [];
        }

        return (
            analysis
                .source_catalog[
                origin
            ] ??
            []
        );
    }

    async function analyze() {
        setError(
            null,
        );

        if (
            !name.trim()
        ) {
            setError(
                "Informe o nome do modelo.",
            );

            return;
        }

        if (
            content
                .trim()
                .length <
            10
        ) {
            setError(
                "Cole o conteúdo do documento antes de analisar.",
            );

            return;
        }

        setAnalyzing(
            true,
        );

        try {
            const response =
                await api.post(
                    "/api/templates-contrato/texto/preview",
                    {
                        conteudo:
                            content,
                    },
                );

            const result =
                response
                    .data
                    .data as TemplateTextAnalysis;

            setAnalysis(
                result,
            );

            initializeMappings(
                result,
            );
        } catch (
            requestError
        ) {
            setError(
                errorMessage(
                    requestError,
                    "Não foi possível analisar o documento.",
                ),
            );
        } finally {
            setAnalyzing(
                false,
            );
        }
    }

    function updateMapping(
        field: string,
        patch:
            Partial<
                EditableMapping
            >,
    ) {
        setMappings(
            (
                current,
            ) => ({
                ...current,

                [field]: {
                    ...current[
                        field
                    ],

                    ...patch,
                },
            }),
        );
    }

    function changeType(
        field: string,
        type:
            MappingType,
    ) {
        const current =
            mappings[
                field
            ];

        if (
            type ===
            "manual"
        ) {
            updateMapping(
                field,
                {
                    tipo:
                        "manual",

                    origem:
                        "",

                    campo:
                        "",
                },
            );

            return;
        }

        if (
            type ===
            "assinatura"
        ) {
            const options =
                sourceOptions(
                    "assinatura",
                );

            const existingIsValid =
                options.some(
                    (
                        option,
                    ) =>
                        option
                            .value ===
                        current
                            ?.campo,
                );

            updateMapping(
                field,
                {
                    tipo:
                        "assinatura",

                    origem:
                        "assinatura",

                    campo:
                        existingIsValid
                            ? current
                                  .campo
                            : options[
                                  0
                              ]
                                  ?.value ??
                              "",
                },
            );

            return;
        }

        let origin =
            current?.origem ??
            "";

        if (
            origin ===
            "assinatura"
        ) {
            origin =
                "";
        }

        const options =
            sourceOptions(
                origin,
            );

        const existingIsValid =
            options.some(
                (
                    option,
                ) =>
                    option
                        .value ===
                    current
                        ?.campo,
            );

        updateMapping(
            field,
            {
                tipo:
                    type,

                origem:
                    origin,

                campo:
                    existingIsValid
                        ? current
                              .campo
                        : "",
            },
        );
    }

    function changeOrigin(
        field: string,
        origin:
            MappingOrigin |
            "",
    ) {
        const current =
            mappings[
                field
            ];

        if (!origin) {
            updateMapping(
                field,
                {
                    origem:
                        "",

                    campo:
                        "",
                },
            );

            return;
        }

        const options =
            sourceOptions(
                origin,
            );

        const existingIsValid =
            options.some(
                (
                    option,
                ) =>
                    option
                        .value ===
                    current
                        ?.campo,
            );

        updateMapping(
            field,
            {
                origem:
                    origin,

                campo:
                    existingIsValid
                        ? current
                              .campo
                        : options[
                              0
                          ]
                              ?.value ??
                          "",

                tipo:
                    origin ===
                    "assinatura"
                        ? "assinatura"
                        : current
                                  ?.tipo ===
                              "assinatura"
                          ? "automatico"
                          : current
                                ?.tipo ??
                            "automatico",
            },
        );
    }

    async function save() {
        if (!analysis) {
            return;
        }

        setError(
            null,
        );

        const reviewed:
            Record<
                string,
                {
                    tipo:
                        MappingType;

                    origem:
                        MappingOrigin |
                        null;

                    campo:
                        string |
                        null;
                }
            > = {};

        for (
            const [
                field,
                mapping,
            ] of
            Object.entries(
                mappings,
            )
        ) {
            if (
                mapping.tipo !==
                    "manual" &&
                (
                    !mapping.origem ||
                    !mapping.campo
                )
            ) {
                setError(
                    `Confirme a origem do campo ${field}.`,
                );

                return;
            }

            reviewed[
                field
            ] = {
                tipo:
                    mapping.tipo,

                origem:
                    mapping
                        .tipo ===
                    "manual"
                        ? null
                        : mapping
                              .origem ||
                          null,

                campo:
                    mapping
                        .tipo ===
                    "manual"
                        ? null
                        : mapping
                              .campo ||
                          null,
            };
        }

        setSaving(
            true,
        );

        try {
            await api.post(
                "/api/templates-contrato/texto",
                {
                    nome:
                        name.trim(),

                    perfil_id:
                        profileId ||
                        null,

                    conteudo:
                        content,

                    campos_mapeados:
                        reviewed,
                },
            );

            await onSaved();
        } catch (
            requestError
        ) {
            setError(
                errorMessage(
                    requestError,
                    "Não foi possível guardar o modelo.",
                ),
            );
        } finally {
            setSaving(
                false,
            );
        }
    }

    function returnToEditor() {
        setAnalysis(
            null,
        );

        setMappings(
            {},
        );

        setError(
            null,
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
                type="button"
                aria-label="Fechar"
                onClick={
                    onClose
                }
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />

            <div className="relative max-h-[94vh] w-full max-w-7xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
                <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                            Modelo de documento
                        </p>

                        <h2 className="mt-1 text-lg font-semibold text-slate-950">
                            {analysis
                                ? "Rever análise"
                                : "Criar a partir de texto"}
                        </h2>
                    </div>

                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </header>

                {!analysis ? (
                    <>
                        <div className="space-y-6 p-6">
                            {error && (
                                <ErrorBox>
                                    {
                                        error
                                    }
                                </ErrorBox>
                            )}

                            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
                                <div className="flex gap-3">
                                    <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />

                                    <div>
                                        <h3 className="font-semibold text-indigo-950">
                                            Reconhecimento automático
                                        </h3>

                                        <p className="mt-1 text-sm leading-6 text-indigo-800">
                                            Cole um contrato, declaração ou
                                            outro documento. O FrotaPro irá
                                            identificar campos variáveis,
                                            normalizar placeholders e sugerir
                                            de onde cada valor deverá ser
                                            obtido.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <Field
                                    label="Nome do modelo"
                                    value={
                                        name
                                    }
                                    onChange={
                                        setName
                                    }
                                    placeholder="Contrato de prestação de serviços"
                                />

                                <label className="block">
                                    <span className="mb-2 block text-sm font-medium text-slate-700">
                                        Perfil
                                    </span>

                                    <select
                                        value={
                                            profileId
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setProfileId(
                                                event
                                                    .target
                                                    .value,
                                            )
                                        }
                                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                                    >
                                        <option value="">
                                            Sem perfil
                                        </option>

                                        {profiles.map(
                                            (
                                                profile,
                                            ) => (
                                                <option
                                                    key={
                                                        profile.id
                                                    }
                                                    value={
                                                        profile.id
                                                    }
                                                >
                                                    {
                                                        profile.nome
                                                    }
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </label>
                            </div>

                            <label className="block">
                                <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                                    <ClipboardPaste className="h-4 w-4" />

                                    Texto do documento
                                </span>

                                <textarea
                                    value={
                                        content
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setContent(
                                            event
                                                .target
                                                .value,
                                        )
                                    }
                                    rows={
                                        20
                                    }
                                    placeholder="Cole aqui o conteúdo completo do contrato, declaração ou outro documento..."
                                    className="w-full rounded-xl border border-slate-200 px-4 py-3 font-mono text-sm leading-6 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                                />
                            </label>

                            <div className="flex items-center justify-between text-xs text-slate-400">
                                <span>
                                    {
                                        content
                                            .length
                                    }{" "}
                                    caracteres
                                </span>

                                <span>
                                    O documento ainda não será guardado.
                                </span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
                            <button
                                type="button"
                                onClick={
                                    onClose
                                }
                                className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-600"
                            >
                                Cancelar
                            </button>

                            <button
                                type="button"
                                onClick={
                                    analyze
                                }
                                disabled={
                                    analyzing
                                }
                                className="flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
                            >
                                {analyzing ? (
                                    <LoaderCircle className="h-4 w-4 animate-spin" />
                                ) : (
                                    <FileSearch className="h-4 w-4" />
                                )}

                                Analisar documento
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="space-y-6 p-6">
                            {error && (
                                <ErrorBox>
                                    {
                                        error
                                    }
                                </ErrorBox>
                            )}

                            <div className="grid gap-4 sm:grid-cols-3">
                                <Stat
                                    label="Campos encontrados"
                                    value={
                                        analysis
                                            .stats
                                            .campos
                                    }
                                />

                                <Stat
                                    label="Valores reconhecidos"
                                    value={
                                        analysis
                                            .stats
                                            .valores_detectados
                                    }
                                />

                                <Stat
                                    label="Avisos"
                                    value={
                                        analysis
                                            .stats
                                            .avisos
                                    }
                                />
                            </div>

                            {analysis
                                .warnings
                                .length >
                                0 && (
                                <div className="space-y-2">
                                    {analysis.warnings.map(
                                        (
                                            warning,
                                            index,
                                        ) => (
                                            <Warning
                                                key={`${warning.code}-${index}`}
                                                warning={
                                                    warning
                                                }
                                            />
                                        ),
                                    )}
                                </div>
                            )}

                            <section>
                                <div className="mb-4">
                                    <h3 className="font-semibold text-slate-950">
                                        Campos detectados
                                    </h3>

                                    <p className="mt-1 text-sm text-slate-500">
                                        Confirme o tipo, a origem e o campo do
                                        FrotaPro que fornecerá cada valor.
                                    </p>
                                </div>

                                {analysis
                                    .fields
                                    .length ===
                                0 ? (
                                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
                                        Nenhum campo variável foi identificado.
                                        Volte ao texto para corrigir ou
                                        acrescentar os dados que devem ser
                                        parametrizados.
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto rounded-2xl border border-slate-200">
                                        <table className="w-full min-w-[1100px] text-left">
                                            <thead className="border-b border-slate-200 bg-slate-50">
                                                <tr>
                                                    <Th>
                                                        Campo
                                                    </Th>

                                                    <Th>
                                                        Reconhecimento
                                                    </Th>

                                                    <Th>
                                                        Tipo
                                                    </Th>

                                                    <Th>
                                                        Origem
                                                    </Th>

                                                    <Th>
                                                        Campo de origem
                                                    </Th>
                                                </tr>
                                            </thead>

                                            <tbody className="divide-y divide-slate-100">
                                                {analysis.fields.map(
                                                    (
                                                        field,
                                                    ) => {
                                                        const mapping =
                                                            mappings[
                                                                field
                                                                    .name
                                                            ];

                                                        const options =
                                                            sourceOptions(
                                                                mapping
                                                                    ?.origem ??
                                                                    "",
                                                            );

                                                        const manual =
                                                            mapping
                                                                ?.tipo ===
                                                            "manual";

                                                        return (
                                                            <tr
                                                                key={
                                                                    field.name
                                                                }
                                                                className="align-top"
                                                            >
                                                                <td className="px-4 py-4">
                                                                    <div className="font-semibold text-slate-900">
                                                                        {
                                                                            field.label
                                                                        }
                                                                    </div>

                                                                    <div className="mt-1 font-mono text-xs text-indigo-600">
                                                                        {
                                                                            field.name
                                                                        }
                                                                    </div>

                                                                    {field.required && (
                                                                        <span className="mt-2 inline-flex rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600">
                                                                            Obrigatório
                                                                        </span>
                                                                    )}
                                                                </td>

                                                                <td className="px-4 py-4">
                                                                    <div className="text-sm font-semibold text-slate-700">
                                                                        {confidenceLabel(
                                                                            field.confidence,
                                                                        )}
                                                                    </div>

                                                                    {field
                                                                        .detected_values
                                                                        .length >
                                                                        0 && (
                                                                        <div className="mt-2 max-w-[220px] space-y-1">
                                                                            {field.detected_values.map(
                                                                                (
                                                                                    value,
                                                                                ) => (
                                                                                    <div
                                                                                        key={
                                                                                            value
                                                                                        }
                                                                                        title={
                                                                                            value
                                                                                        }
                                                                                        className="truncate rounded-lg bg-emerald-50 px-2 py-1 text-xs text-emerald-700"
                                                                                    >
                                                                                        {
                                                                                            value
                                                                                        }
                                                                                    </div>
                                                                                ),
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                    {field
                                                                        .aliases
                                                                        .length >
                                                                        0 && (
                                                                        <div className="mt-2 max-w-[220px] text-xs text-slate-400">
                                                                            Original:{" "}
                                                                            {field.aliases.join(
                                                                                ", ",
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </td>

                                                                <td className="px-4 py-4">
                                                                    <select
                                                                        value={
                                                                            mapping
                                                                                ?.tipo ??
                                                                            "manual"
                                                                        }
                                                                        onChange={(
                                                                            event,
                                                                        ) =>
                                                                            changeType(
                                                                                field.name,
                                                                                event
                                                                                    .target
                                                                                    .value as MappingType,
                                                                            )
                                                                        }
                                                                        className="h-10 min-w-[150px] rounded-xl border border-slate-200 bg-white px-3 text-sm"
                                                                    >
                                                                        <option value="automatico">
                                                                            Automático
                                                                        </option>

                                                                        <option value="manual">
                                                                            Manual
                                                                        </option>

                                                                        <option value="calculado">
                                                                            Calculado
                                                                        </option>

                                                                        <option value="assinatura">
                                                                            Assinatura
                                                                        </option>
                                                                    </select>
                                                                </td>

                                                                <td className="px-4 py-4">
                                                                    <select
                                                                        value={
                                                                            mapping
                                                                                ?.origem ??
                                                                            ""
                                                                        }
                                                                        disabled={
                                                                            manual
                                                                        }
                                                                        onChange={(
                                                                            event,
                                                                        ) =>
                                                                            changeOrigin(
                                                                                field.name,
                                                                                event
                                                                                    .target
                                                                                    .value as MappingOrigin | "",
                                                                            )
                                                                        }
                                                                        className="h-10 min-w-[150px] rounded-xl border border-slate-200 bg-white px-3 text-sm disabled:bg-slate-100 disabled:text-slate-400"
                                                                    >
                                                                        <option value="">
                                                                            {manual
                                                                                ? "Preenchimento manual"
                                                                                : "Selecionar..."}
                                                                        </option>

                                                                        {(
                                                                            Object.keys(
                                                                                originLabels,
                                                                            ) as MappingOrigin[]
                                                                        ).map(
                                                                            (
                                                                                origin,
                                                                            ) => (
                                                                                <option
                                                                                    key={
                                                                                        origin
                                                                                    }
                                                                                    value={
                                                                                        origin
                                                                                    }
                                                                                >
                                                                                    {
                                                                                        originLabels[
                                                                                            origin
                                                                                        ]
                                                                                    }
                                                                                </option>
                                                                            ),
                                                                        )}
                                                                    </select>
                                                                </td>

                                                                <td className="px-4 py-4">
                                                                    <select
                                                                        value={
                                                                            mapping
                                                                                ?.campo ??
                                                                            ""
                                                                        }
                                                                        disabled={
                                                                            manual ||
                                                                            !mapping
                                                                                ?.origem
                                                                        }
                                                                        onChange={(
                                                                            event,
                                                                        ) =>
                                                                            updateMapping(
                                                                                field.name,
                                                                                {
                                                                                    campo:
                                                                                        event
                                                                                            .target
                                                                                            .value,
                                                                                },
                                                                            )
                                                                        }
                                                                        className="h-10 min-w-[260px] rounded-xl border border-slate-200 bg-white px-3 text-sm disabled:bg-slate-100 disabled:text-slate-400"
                                                                    >
                                                                        <option value="">
                                                                            {manual
                                                                                ? "Não aplicável"
                                                                                : mapping
                                                                                        ?.origem
                                                                                  ? "Selecionar campo..."
                                                                                  : "Selecione primeiro a origem"}
                                                                        </option>

                                                                        {options.map(
                                                                            (
                                                                                option,
                                                                            ) => (
                                                                                <option
                                                                                    key={
                                                                                        option.value
                                                                                    }
                                                                                    value={
                                                                                        option.value
                                                                                    }
                                                                                >
                                                                                    {
                                                                                        option.label
                                                                                    }
                                                                                </option>
                                                                            ),
                                                                        )}
                                                                    </select>

                                                                    {!manual &&
                                                                        mapping
                                                                            ?.campo && (
                                                                            <div className="mt-1 font-mono text-[11px] text-slate-400">
                                                                                {
                                                                                    mapping.campo
                                                                                }
                                                                            </div>
                                                                        )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    },
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </section>

                            <section>
                                <div className="mb-3">
                                    <h3 className="font-semibold text-slate-950">
                                        Preview parametrizado
                                    </h3>

                                    <p className="mt-1 text-sm text-slate-500">
                                        Este é o conteúdo normalizado que será
                                        utilizado como base do documento.
                                    </p>
                                </div>

                                <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-950 p-5 font-mono text-xs leading-6 text-slate-200">
                                    {
                                        analysis
                                            .conteudo_parametrizado
                                    }
                                </pre>
                            </section>

                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                                <div className="flex gap-3">
                                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

                                    <div>
                                        <h3 className="font-semibold text-slate-900">
                                            Revisão antes de guardar
                                        </h3>

                                        <p className="mt-1 text-sm leading-6 text-slate-500">
                                            O backend validará novamente o
                                            documento e recusará campos ou
                                            origens fora do catálogo permitido
                                            pelo FrotaPro.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="sticky bottom-0 flex flex-col gap-3 border-t border-slate-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <button
                                type="button"
                                onClick={
                                    returnToEditor
                                }
                                className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-600"
                            >
                                <ArrowLeft className="h-4 w-4" />

                                Voltar e editar
                            </button>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={
                                        onClose
                                    }
                                    className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-600"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="button"
                                    onClick={
                                        save
                                    }
                                    disabled={
                                        saving ||
                                        hasBlockingWarnings
                                    }
                                    className="flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {saving ? (
                                        <LoaderCircle className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Save className="h-4 w-4" />
                                    )}

                                    Guardar modelo
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function Warning({
    warning,
}: {
    warning:
        AnalysisWarning;
}) {
    const classes =
        warning.severity ===
        "error"
            ? "border-red-200 bg-red-50 text-red-700"
            : warning
                    .severity ===
                "warning"
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : "border-blue-200 bg-blue-50 text-blue-700";

    return (
        <div
            className={[
                "flex gap-3 rounded-xl border p-4 text-sm",
                classes,
            ].join(
                " ",
            )}
        >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
                <div>
                    {
                        warning.message
                    }
                </div>

                {warning.field && (
                    <div className="mt-1 font-mono text-xs opacity-70">
                        {
                            warning.field
                        }
                    </div>
                )}
            </div>
        </div>
    );
}

function ErrorBox({
    children,
}: {
    children: string;
}) {
    return (
        <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="h-5 w-5 shrink-0" />

            {children}
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
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm text-slate-500">
                {label}
            </div>

            <div className="mt-1 text-2xl font-bold text-slate-950">
                {value}
            </div>
        </div>
    );
}

function Field({
    label,
    value,
    onChange,
    placeholder,
}: {
    label: string;
    value: string;

    onChange: (
        value: string,
    ) => void;

    placeholder?:
        string;
}) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
                {label}
            </span>

            <input
                value={
                    value
                }
                onChange={(
                    event,
                ) =>
                    onChange(
                        event
                            .target
                            .value,
                    )
                }
                placeholder={
                    placeholder
                }
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            />
        </label>
    );
}

function Th({
    children,
}: {
    children: string;
}) {
    return (
        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            {children}
        </th>
    );
}
