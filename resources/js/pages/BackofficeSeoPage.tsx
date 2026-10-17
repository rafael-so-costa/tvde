import {
    CheckCircle2,
    Globe2,
    ImagePlus,
    LoaderCircle,
    RefreshCcw,
    Save,
    Search,
    Share2,
} from "lucide-react";

import {
    useEffect,
    useState,
} from "react";

import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";

import api from "../lib/api";

interface SeoValues {
    titulo: string;
    descricao: string;
    canonical_url: string;
    robots: string;
    og_title: string;
    og_description: string;
    og_image_path: string;
    favicon_path: string;
    social_image_path: string;
    twitter_card: string;
    schema_type: string;

    favicon_url?:
        | string
        | null;

    social_image_url?:
        | string
        | null;

    og_image_url?:
        | string
        | null;
}

interface Preset {
    label: string;
    description: string;
    defaults: SeoValues;
}

interface SeoResponse {
    data: Array<{
        chave: string;
    }>;

    presets: Record<
        string,
        Preset
    >;

    resolved: Record<
        string,
        SeoValues
    >;
}

const empty: SeoValues = {
    titulo: "",
    descricao: "",
    canonical_url: "",
    robots: "index,follow",
    og_title: "",
    og_description: "",
    og_image_path: "",
    favicon_path: "",
    social_image_path: "",
    twitter_card:
        "summary_large_image",
    schema_type: "",
};

export default function BackofficeSeoPage() {
    const queryClient =
        useQueryClient();

    const [
        selected,
        setSelected,
    ] = useState(
        "global",
    );

    const [form, setForm] =
        useState<SeoValues>(
            empty,
        );

    const [
        message,
        setMessage,
    ] = useState("");

    const query =
        useQuery({
            queryKey: [
                "backoffice",
                "seo",
            ],

            queryFn:
                async () =>
                    (
                        await api.get(
                            "/api/backoffice/seo",
                        )
                    ).data as SeoResponse,
        });

    const preset =
        query.data?.presets[
            selected
        ];

    const resolved =
        query.data?.resolved[
            selected
        ];

    const global =
        query.data?.resolved
            .global;

    useEffect(() => {
        if (!resolved) {
            return;
        }

        setForm({
            ...empty,
            ...resolved,

            titulo:
                resolved.titulo ??
                "",

            descricao:
                resolved.descricao ??
                "",

            canonical_url:
                resolved.canonical_url ??
                "",

            og_title:
                resolved.og_title ??
                "",

            og_description:
                resolved.og_description ??
                "",

            og_image_path:
                resolved.og_image_path ??
                "",

            favicon_path:
                resolved.favicon_path ??
                "",

            social_image_path:
                resolved.social_image_path ??
                "",

            schema_type:
                resolved.schema_type ??
                "",
        });

        setMessage("");
    }, [
        resolved,
    ]);

    const saveMutation =
        useMutation({
            mutationFn:
                async () =>
                    (
                        await api.patch(
                            `/api/backoffice/seo/${selected}`,
                            {
                                titulo:
                                    form.titulo ||
                                    null,

                                descricao:
                                    form.descricao ||
                                    null,

                                canonical_url:
                                    form.canonical_url ||
                                    null,

                                robots:
                                    form.robots,

                                og_title:
                                    form.og_title ||
                                    null,

                                og_description:
                                    form.og_description ||
                                    null,

                                og_image_path:
                                    form.og_image_path ||
                                    null,

                                twitter_card:
                                    form.twitter_card,

                                schema_type:
                                    form.schema_type ||
                                    null,
                            },
                        )
                    ).data,

            onSuccess:
                async () => {
                    await queryClient
                        .invalidateQueries({
                            queryKey: [
                                "backoffice",
                                "seo",
                            ],
                        });

                    setMessage(
                        "Configuração SEO guardada.",
                    );
                },
        });

    const assetMutation =
        useMutation({
            mutationFn:
                async ({
                    kind,
                    file,
                }: {
                    kind:
                        | "favicon"
                        | "social";

                    file: File;
                }) => {
                    const data =
                        new FormData();

                    data.append(
                        "kind",
                        kind,
                    );

                    data.append(
                        "image",
                        file,
                    );

                    return (
                        await api.post(
                            "/api/backoffice/seo/assets",
                            data,
                        )
                    ).data;
                },

            onSuccess:
                async () => {
                    await queryClient
                        .invalidateQueries({
                            queryKey: [
                                "backoffice",
                                "seo",
                            ],
                        });
                },
        });

    if (
        query.isLoading ||
        !query.data
    ) {
        return (
            <div className="flex min-h-72 items-center justify-center">
                <LoaderCircle className="h-7 w-7 animate-spin text-indigo-600" />
            </div>
        );
    }

    const configured =
        query.data.data.length;

    return (
        <div className="mx-auto max-w-7xl space-y-7">
            <section>
                <p className="text-sm font-semibold text-indigo-600">
                    Site público
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                    SEO e Identidade
                </h1>

                <p className="mt-2 max-w-3xl text-slate-500">
                    Controle como o FrotaPRO aparece no Google, redes sociais e navegadores. Os valores recomendados já utilizam as informações existentes da plataforma.
                </p>
            </section>

            <section className="grid gap-4 sm:grid-cols-3">
                <Metric
                    label="Páginas configuradas"
                    value={`${configured}/5`}
                    icon={Search}
                />

                <Metric
                    label="Favicon"
                    value={
                        global?.favicon_path
                            ? "Configurado"
                            : "Pendente"
                    }
                    icon={
                        CheckCircle2
                    }
                />

                <Metric
                    label="Imagem social global"
                    value={
                        global?.social_image_path
                            ? "Configurada"
                            : "Pendente"
                    }
                    icon={Share2}
                />
            </section>

            <div className="grid gap-6 lg:grid-cols-[19rem_minmax(0,1fr)]">
                <aside className="space-y-2">
                    {Object.entries(
                        query.data
                            .presets,
                    ).map(
                        ([
                            key,
                            item,
                        ]) => (
                            <button
                                key={
                                    key
                                }
                                type="button"
                                onClick={() =>
                                    setSelected(
                                        key,
                                    )
                                }
                                className={[
                                    "w-full rounded-2xl border p-4 text-left transition",
                                    selected ===
                                    key
                                        ? "border-indigo-300 bg-indigo-50"
                                        : "border-slate-200 bg-white hover:border-indigo-200",
                                ].join(
                                    " ",
                                )}
                            >
                                <div className="font-semibold text-slate-900">
                                    {
                                        item.label
                                    }
                                </div>

                                <div className="mt-1 text-xs leading-5 text-slate-500">
                                    {
                                        item.description
                                    }
                                </div>
                            </button>
                        ),
                    )}
                </aside>

                <div className="space-y-6">
                    {selected ===
                        "global" && (
                        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                            <h2 className="text-lg font-bold text-slate-950">
                                Identidade global
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Estes ficheiros são utilizados em todas as páginas públicas quando não existir uma imagem específica.
                            </p>

                            <div className="mt-6 grid gap-5 md:grid-cols-2">
                                <AssetUpload
                                    label="Favicon"
                                    description="Ícone do navegador. Recomendado: PNG quadrado, 256×256 ou 512×512."
                                    preview={
                                        global?.favicon_url
                                    }
                                    accept="image/png,image/jpeg,image/webp,image/x-icon"
                                    onFile={(
                                        file,
                                    ) =>
                                        assetMutation.mutate(
                                            {
                                                kind:
                                                    "favicon",

                                                file,
                                            },
                                        )
                                    }
                                />

                                <AssetUpload
                                    label="Imagem padrão das redes sociais"
                                    description="Usada em Facebook, LinkedIn, WhatsApp, X e outras redes. Recomendado: 1200×630."
                                    preview={
                                        global?.social_image_url
                                    }
                                    accept="image/png,image/jpeg,image/webp"
                                    onFile={(
                                        file,
                                    ) =>
                                        assetMutation.mutate(
                                            {
                                                kind:
                                                    "social",

                                                file,
                                            },
                                        )
                                    }
                                />
                            </div>
                        </section>
                    )}

                    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-slate-950">
                                    {
                                        preset?.label
                                    }
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    {
                                        preset?.description
                                    }
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    preset &&
                                    setForm({
                                        ...empty,
                                        ...preset.defaults,
                                    })
                                }
                                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                            >
                                <RefreshCcw className="h-4 w-4" />

                                Usar valores recomendados
                            </button>
                        </div>

                        <div className="mt-6 grid gap-5">
                            <Field
                                label="Título SEO"
                                value={
                                    form.titulo
                                }
                                helper={`${form.titulo.length}/255`}
                                onChange={(
                                    value,
                                ) =>
                                    update(
                                        setForm,
                                        "titulo",
                                        value,
                                    )
                                }
                            />

                            <TextArea
                                label="Descrição"
                                value={
                                    form.descricao
                                }
                                helper={`${form.descricao.length}/500`}
                                onChange={(
                                    value,
                                ) =>
                                    update(
                                        setForm,
                                        "descricao",
                                        value,
                                    )
                                }
                            />

                            <Field
                                label="Canonical URL"
                                value={
                                    form.canonical_url
                                }
                                placeholder="Normalmente pode ficar vazio"
                                onChange={(
                                    value,
                                ) =>
                                    update(
                                        setForm,
                                        "canonical_url",
                                        value,
                                    )
                                }
                            />

                            <div className="grid gap-5 md:grid-cols-2">
                                <Select
                                    label="Indexação"
                                    value={
                                        form.robots
                                    }
                                    options={[
                                        [
                                            "index,follow",
                                            "Indexar e seguir links",
                                        ],
                                        [
                                            "noindex,follow",
                                            "Não indexar",
                                        ],
                                        [
                                            "noindex,nofollow",
                                            "Não indexar nem seguir",
                                        ],
                                    ]}
                                    onChange={(
                                        value,
                                    ) =>
                                        update(
                                            setForm,
                                            "robots",
                                            value,
                                        )
                                    }
                                />

                                <Field
                                    label="Schema.org"
                                    value={
                                        form.schema_type
                                    }
                                    placeholder="WebPage, Blog, CollectionPage..."
                                    onChange={(
                                        value,
                                    ) =>
                                        update(
                                            setForm,
                                            "schema_type",
                                            value,
                                        )
                                    }
                                />
                            </div>
                        </div>
                    </section>

                    <section className="grid gap-6 xl:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                            <h2 className="font-bold text-slate-950">
                                Google
                            </h2>

                            <div className="mt-5 rounded-xl border border-slate-200 p-4">
                                <div className="text-xs text-slate-500">
                                    frotapro
                                </div>

                                <div className="mt-1 text-xl text-[#1a0dab]">
                                    {form.titulo ||
                                        "FrotaPRO"}
                                </div>

                                <div className="mt-1 text-sm leading-6 text-slate-600">
                                    {form.descricao ||
                                        "Descrição da página FrotaPRO."}
                                </div>
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                            {global?.social_image_url ? (
                                <img
                                    src={
                                        global.social_image_url
                                    }
                                    alt=""
                                    className="aspect-[1.91/1] w-full object-cover"
                                />
                            ) : (
                                <div className="flex aspect-[1.91/1] items-center justify-center bg-slate-100 text-slate-300">
                                    <Share2 className="h-10 w-10" />
                                </div>
                            )}

                            <div className="p-5">
                                <div className="text-xs uppercase tracking-wide text-slate-400">
                                    FrotaPRO
                                </div>

                                <div className="mt-1 font-bold text-slate-950">
                                    {form.og_title ||
                                        form.titulo}
                                </div>

                                <div className="mt-2 text-sm leading-6 text-slate-500">
                                    {form.og_description ||
                                        form.descricao}
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                        <h2 className="font-bold text-slate-950">
                            Redes sociais
                        </h2>

                        <div className="mt-5 grid gap-5">
                            <Field
                                label="Título social"
                                value={
                                    form.og_title
                                }
                                placeholder="Se vazio, usa o título SEO"
                                onChange={(
                                    value,
                                ) =>
                                    update(
                                        setForm,
                                        "og_title",
                                        value,
                                    )
                                }
                            />

                            <TextArea
                                label="Descrição social"
                                value={
                                    form.og_description
                                }
                                placeholder="Se vazio, usa a descrição SEO"
                                onChange={(
                                    value,
                                ) =>
                                    update(
                                        setForm,
                                        "og_description",
                                        value,
                                    )
                                }
                            />
                        </div>
                    </section>

                    {message && (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                            {message}
                        </div>
                    )}

                    <div className="flex justify-end">
                        <button
                            type="button"
                            disabled={
                                saveMutation.isPending
                            }
                            onClick={() =>
                                saveMutation.mutate()
                            }
                            className="inline-flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                        >
                            {saveMutation.isPending ? (
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4" />
                            )}

                            Guardar configuração
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function AssetUpload({
    label,
    description,
    preview,
    accept,
    onFile,
}: {
    label: string;
    description: string;
    preview?:
        | string
        | null;
    accept: string;
    onFile: (
        file: File,
    ) => void;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 p-4">
            <div className="font-semibold text-slate-900">
                {label}
            </div>

            <div className="mt-1 min-h-10 text-xs leading-5 text-slate-500">
                {description}
            </div>

            <div className="mt-4 flex min-h-32 items-center justify-center overflow-hidden rounded-xl bg-slate-50">
                {preview ? (
                    <img
                        src={preview}
                        alt=""
                        className="max-h-48 max-w-full object-contain"
                    />
                ) : (
                    <ImagePlus className="h-9 w-9 text-slate-300" />
                )}
            </div>

            <label className="mt-4 inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-indigo-600 hover:bg-indigo-50">
                <ImagePlus className="h-4 w-4" />

                {preview
                    ? "Substituir"
                    : "Carregar imagem"}

                <input
                    type="file"
                    accept={accept}
                    className="hidden"
                    onChange={(
                        event,
                    ) => {
                        const file =
                            event.target
                                .files?.[0];

                        event.target.value =
                            "";

                        if (file) {
                            onFile(
                                file,
                            );
                        }
                    }}
                />
            </label>
        </div>
    );
}

function Metric({
    label,
    value,
    icon: Icon,
}: {
    label: string;
    value: string;
    icon: typeof Globe2;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-slate-500">
                        {label}
                    </p>

                    <p className="mt-2 text-xl font-bold text-slate-950">
                        {value}
                    </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <Icon className="h-5 w-5" />
                </div>
            </div>
        </div>
    );
}

function update(
    setter: React.Dispatch<
        React.SetStateAction<SeoValues>
    >,
    key: keyof SeoValues,
    value: string,
) {
    setter((current) => ({
        ...current,
        [key]: value,
    }));
}

function Field({
    label,
    value,
    helper,
    placeholder,
    onChange,
}: {
    label: string;
    value: string;
    helper?: string;
    placeholder?: string;
    onChange: (
        value: string,
    ) => void;
}) {
    return (
        <label className="block">
            <div className="flex justify-between gap-3">
                <span className="text-sm font-semibold text-slate-700">
                    {label}
                </span>

                {helper && (
                    <span className="text-xs text-slate-400">
                        {helper}
                    </span>
                )}
            </div>

            <input
                value={value}
                placeholder={
                    placeholder
                }
                onChange={(
                    event,
                ) =>
                    onChange(
                        event.target
                            .value,
                    )
                }
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
            />
        </label>
    );
}

function TextArea({
    label,
    value,
    helper,
    placeholder,
    onChange,
}: {
    label: string;
    value: string;
    helper?: string;
    placeholder?: string;
    onChange: (
        value: string,
    ) => void;
}) {
    return (
        <label className="block">
            <div className="flex justify-between gap-3">
                <span className="text-sm font-semibold text-slate-700">
                    {label}
                </span>

                {helper && (
                    <span className="text-xs text-slate-400">
                        {helper}
                    </span>
                )}
            </div>

            <textarea
                rows={4}
                value={value}
                placeholder={
                    placeholder
                }
                onChange={(
                    event,
                ) =>
                    onChange(
                        event.target
                            .value,
                    )
                }
                className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
            />
        </label>
    );
}

function Select({
    label,
    value,
    options,
    onChange,
}: {
    label: string;
    value: string;
    options: Array<
        [string, string]
    >;
    onChange: (
        value: string,
    ) => void;
}) {
    return (
        <label className="block">
            <span className="text-sm font-semibold text-slate-700">
                {label}
            </span>

            <select
                value={value}
                onChange={(
                    event,
                ) =>
                    onChange(
                        event.target
                            .value,
                    )
                }
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm"
            >
                {options.map(
                    ([
                        value,
                        label,
                    ]) => (
                        <option
                            key={
                                value
                            }
                            value={
                                value
                            }
                        >
                            {label}
                        </option>
                    ),
                )}
            </select>
        </label>
    );
}