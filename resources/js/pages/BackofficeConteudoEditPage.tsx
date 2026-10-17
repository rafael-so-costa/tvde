import {
    Archive,
    ArrowLeft,
    BarChart3,
    Check,
    Clock3,
    Eye,
    ImagePlus,
    LoaderCircle,
    Save,
    Send,
} from "lucide-react";

import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";

import {
    Link,
    useNavigate,
    useParams,
} from "react-router-dom";

import RichTextEditor from "../components/content/RichTextEditor";
import api from "../lib/api";
import {
    appUrl,
} from "../lib/runtime";

interface Category {
    id: string;
    nome: string;
    slug: string;
}

interface Post {
    id: string;

    categoria_id:
        | string
        | null;

    categorias:
        Category[];

    tipo: string;
    titulo: string;
    slug: string;

    resumo:
        | string
        | null;

    conteudo: string;

    imagem_destaque_path:
        | string
        | null;

    imagem_capa_path:
        | string
        | null;

    status: string;

    publicado_em:
        | string
        | null;

    seo_title:
        | string
        | null;

    seo_description:
        | string
        | null;

    canonical_url:
        | string
        | null;

    og_image_path:
        | string
        | null;

    robots:
        | string
        | null;

    tags: Array<{
        id: string;
        nome: string;
        slug: string;
    }>;

    views_count: number;
    reads_count: number;

    last_view_at:
        | string
        | null;

    tempo_leitura: number;
    numero_palavras: number;

    updated_at: string;
}

interface FormData {
    categoria_ids: string[];

    tipo: string;

    titulo: string;

    resumo: string;

    conteudo: string;

    imagem_destaque_path:
        string;

    imagem_capa_path:
        string;

    status: string;

    publicado_em:
        string;

    seo_title:
        string;

    seo_description:
        string;

    canonical_url:
        string;

    og_image_path:
        string;

    robots: string;

    tags: string;
}

const emptyForm: FormData = {
    categoria_ids: [],

    tipo: "artigo",

    titulo: "",

    resumo: "",

    conteudo: "",

    imagem_destaque_path:
        "",

    imagem_capa_path:
        "",

    status: "rascunho",

    publicado_em: "",

    seo_title: "",

    seo_description: "",

    canonical_url: "",

    og_image_path: "",

    robots: "index,follow",

    tags: "",
};

export default function BackofficeConteudoEditPage() {
    const { id } =
        useParams();

    const isNew =
        !id;

    const navigate =
        useNavigate();

    const queryClient =
        useQueryClient();

    const [form, setForm] =
        useState<FormData>(
            emptyForm,
        );

    const [
        message,
        setMessage,
    ] = useState("");

    const postQuery =
        useQuery({
            queryKey: [
                "backoffice",
                "conteudo",
                id,
            ],

            enabled:
                !isNew,

            queryFn: async () =>
                (
                    await api.get(
                        `/api/backoffice/conteudo/${id}`,
                    )
                ).data as {
                    data: Post;
                },
        });

    const categoriesQuery =
        useQuery({
            queryKey: [
                "backoffice",
                "conteudo",
                "categorias",
            ],

            queryFn: async () =>
                (
                    await api.get(
                        "/api/backoffice/conteudo/categorias",
                    )
                ).data as {
                    data: Category[];
                },
        });

    const post =
        postQuery.data?.data;

    useEffect(() => {
        if (!post) {
            return;
        }

        setForm({
            categoria_ids:
                post.categorias.map(
                    (
                        category,
                    ) =>
                        category.id,
                ),

            tipo:
                post.tipo,

            titulo:
                post.titulo,

            resumo:
                post.resumo ??
                "",

            conteudo:
                post.conteudo,

            imagem_destaque_path:
                post.imagem_destaque_path ??
                "",

            imagem_capa_path:
                post.imagem_capa_path ??
                "",

            status:
                post.status,

            publicado_em:
                toDateTimeLocal(
                    post.publicado_em,
                ),

            seo_title:
                post.seo_title ??
                "",

            seo_description:
                post.seo_description ??
                "",

            canonical_url:
                post.canonical_url ??
                "",

            og_image_path:
                post.og_image_path ??
                "",

            robots:
                post.robots ??
                "index,follow",

            tags:
                post.tags
                    .map(
                        (
                            tag,
                        ) =>
                            tag.nome,
                    )
                    .join(
                        ", ",
                    ),
        });
    }, [
        post,
    ]);

    const payload =
        useMemo(
            () => ({
                categoria_ids:
                    form.categoria_ids,

                tipo:
                    form.tipo,

                titulo:
                    form.titulo,

                resumo:
                    form.resumo ||
                    null,

                conteudo:
                    form.conteudo,

                imagem_destaque_path:
                    form.imagem_destaque_path ||
                    null,

                imagem_capa_path:
                    form.imagem_capa_path ||
                    null,

                status:
                    form.status,

                publicado_em:
                    form.publicado_em ||
                    null,

                seo_title:
                    form.seo_title ||
                    null,

                seo_description:
                    form.seo_description ||
                    null,

                canonical_url:
                    form.canonical_url ||
                    null,

                og_image_path:
                    form.og_image_path ||
                    null,

                robots:
                    form.robots,

                tags:
                    form.tags
                        .split(
                            ",",
                        )
                        .map(
                            (
                                value,
                            ) =>
                                value.trim(),
                        )
                        .filter(
                            Boolean,
                        ),
            }),
            [
                form,
            ],
        );

    const saveMutation =
        useMutation({
            mutationFn:
                async () => {
                    if (
                        isNew
                    ) {
                        return (
                            await api.post(
                                "/api/backoffice/conteudo",
                                payload,
                            )
                        ).data as {
                            data: Post;
                        };
                    }

                    return (
                        await api.patch(
                            `/api/backoffice/conteudo/${id}`,
                            payload,
                        )
                    ).data as {
                        data: Post;
                    };
                },

            onSuccess:
                async (
                    response,
                ) => {
                    await queryClient
                        .invalidateQueries({
                            queryKey: [
                                "backoffice",
                                "conteudo",
                            ],
                        });

                    setMessage(
                        "Conteúdo guardado com sucesso.",
                    );

                    if (
                        isNew
                    ) {
                        navigate(
                            `/backoffice/conteudo/${response.data.id}`,
                            {
                                replace:
                                    true,
                            },
                        );
                    } else {
                        await postQuery.refetch();
                    }
                },
        });

    const actionMutation =
        useMutation({
            mutationFn:
                async (
                    action:
                        | "publicar"
                        | "arquivar",
                ) =>
                    (
                        await api.post(
                            `/api/backoffice/conteudo/${id}/${action}`,
                        )
                    ).data,

            onSuccess:
                async () => {
                    await postQuery.refetch();

                    await queryClient
                        .invalidateQueries({
                            queryKey: [
                                "backoffice",
                                "conteudo",
                            ],
                        });
                },
        });

    async function uploadImage(
        file: File,
        tipo:
            | "capa"
            | "destaque"
            | "editor",
    ) {
        const data =
            new FormData();

        data.append(
            "tipo",
            tipo,
        );

        data.append(
            "image",
            file,
        );

        const response =
            await api.post(
                "/api/backoffice/conteudo/imagem",
                data,
            );

        return response.data.data as {
            path: string;
            url: string;
        };
    }

    const categories =
        categoriesQuery.data
            ?.data ?? [];

    const views =
        post?.views_count ??
        0;

    const reads =
        post?.reads_count ??
        0;

    const readRate =
        views > 0
            ? Math.round(
                  (reads /
                      views) *
                      1000,
              ) / 10
            : 0;

    if (
        !isNew &&
        postQuery.isLoading
    ) {
        return (
            <div className="flex min-h-72 items-center justify-center">
                <LoaderCircle className="h-7 w-7 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <form
            onSubmit={(
                event,
            ) => {
                event.preventDefault();

                saveMutation.mutate();
            }}
            className="mx-auto max-w-7xl space-y-7"
        >
            <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                    <Link
                        to="/backoffice/conteudo"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600"
                    >
                        <ArrowLeft className="h-4 w-4" />

                        Blog e Conteúdo
                    </Link>

                    <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
                        {isNew
                            ? "Novo artigo"
                            : "Editar artigo"}
                    </h1>

                    {!isNew &&
                        post && (
                            <div className="mt-2 text-sm text-slate-500">
                                URL gerada automaticamente:{" "}
                                <span className="font-medium text-slate-700">
                                    /blog/
                                    {
                                        post.slug
                                    }
                                </span>
                            </div>
                        )}
                </div>

                <div className="flex flex-wrap gap-2">
                    {!isNew && (
                        <>
                            <button
                                type="button"
                                disabled={
                                    actionMutation.isPending
                                }
                                onClick={() =>
                                    actionMutation.mutate(
                                        "publicar",
                                    )
                                }
                                className="inline-flex h-11 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700"
                            >
                                <Send className="h-4 w-4" />

                                Publicar
                            </button>

                            <button
                                type="button"
                                disabled={
                                    actionMutation.isPending
                                }
                                onClick={() =>
                                    actionMutation.mutate(
                                        "arquivar",
                                    )
                                }
                                className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600"
                            >
                                <Archive className="h-4 w-4" />

                                Arquivar
                            </button>
                        </>
                    )}

                    <button
                        type="submit"
                        disabled={
                            saveMutation.isPending
                        }
                        className="inline-flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                    >
                        {saveMutation.isPending ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4" />
                        )}

                        Guardar
                    </button>
                </div>
            </section>

            {message && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                    {message}
                </div>
            )}

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Metric
                    label="Visualizações"
                    value={views}
                    icon={Eye}
                />

                <Metric
                    label="Leituras"
                    value={reads}
                    icon={
                        BarChart3
                    }
                />

                <Metric
                    label="Taxa de leitura"
                    value={`${readRate}%`}
                    icon={Check}
                />

                <Metric
                    label="Tempo estimado"
                    value={
                        post
                            ? `${post.tempo_leitura} min`
                            : "—"
                    }
                    icon={Clock3}
                />
            </section>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
                <div className="space-y-6">
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                        <label className="block">
                            <span className="text-sm font-semibold text-slate-700">
                                Título
                            </span>

                            <input
                                required
                                value={
                                    form.titulo
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setForm(
                                        (
                                            current,
                                        ) => ({
                                            ...current,
                                            titulo:
                                                event
                                                    .target
                                                    .value,
                                        }),
                                    )
                                }
                                placeholder="Título do artigo"
                                className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-lg font-semibold outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                            />
                        </label>

                        <label className="mt-5 block">
                            <span className="text-sm font-semibold text-slate-700">
                                Resumo
                            </span>

                            <textarea
                                rows={4}
                                value={
                                    form.resumo
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setForm(
                                        (
                                            current,
                                        ) => ({
                                            ...current,
                                            resumo:
                                                event
                                                    .target
                                                    .value,
                                        }),
                                    )
                                }
                                placeholder="Pequena introdução utilizada nas listagens e no artigo."
                                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                            />
                        </label>
                    </section>

                    <section>
                        <div className="mb-3">
                            <h2 className="font-semibold text-slate-900">
                                Conteúdo do artigo
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Formate textos, listas, títulos, links, citações e insira imagens diretamente no conteúdo.
                            </p>
                        </div>

                        <RichTextEditor
                            value={
                                form.conteudo
                            }
                            onChange={(
                                value,
                            ) =>
                                setForm(
                                    (
                                        current,
                                    ) => ({
                                        ...current,
                                        conteudo:
                                            value,
                                    }),
                                )
                            }
                            onUploadImage={async (
                                file,
                            ) => {
                                const result =
                                    await uploadImage(
                                        file,
                                        "editor",
                                    );

                                return result.url;
                            }}
                        />
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                        <h2 className="font-semibold text-slate-900">
                            Imagens do artigo
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            A imagem destacada aparece nas listagens. A imagem de capa é utilizada no topo do artigo.
                        </p>

                        <div className="mt-5 grid gap-5 md:grid-cols-2">
                            <ImageUpload
                                label="Imagem destacada"
                                value={
                                    form.imagem_destaque_path
                                }
                                onUpload={async (
                                    file,
                                ) => {
                                    const result =
                                        await uploadImage(
                                            file,
                                            "destaque",
                                        );

                                    setForm(
                                        (
                                            current,
                                        ) => ({
                                            ...current,
                                            imagem_destaque_path:
                                                result.path,
                                        }),
                                    );
                                }}
                            />

                            <ImageUpload
                                label="Imagem de capa"
                                value={
                                    form.imagem_capa_path
                                }
                                onUpload={async (
                                    file,
                                ) => {
                                    const result =
                                        await uploadImage(
                                            file,
                                            "capa",
                                        );

                                    setForm(
                                        (
                                            current,
                                        ) => ({
                                            ...current,
                                            imagem_capa_path:
                                                result.path,
                                        }),
                                    );
                                }}
                            />
                        </div>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                        <h2 className="font-semibold text-slate-900">
                            Categorias
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Um artigo pode pertencer a várias categorias.
                        </p>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {categories.map(
                                (
                                    category,
                                ) => {
                                    const active =
                                        form.categoria_ids.includes(
                                            category.id,
                                        );

                                    return (
                                        <button
                                            key={
                                                category.id
                                            }
                                            type="button"
                                            onClick={() =>
                                                setForm(
                                                    (
                                                        current,
                                                    ) => ({
                                                        ...current,

                                                        categoria_ids:
                                                            active
                                                                ? current.categoria_ids.filter(
                                                                      (
                                                                          value,
                                                                      ) =>
                                                                          value !==
                                                                          category.id,
                                                                  )
                                                                : [
                                                                      ...current.categoria_ids,
                                                                      category.id,
                                                                  ],
                                                    }),
                                                )
                                            }
                                            className={[
                                                "flex min-h-16 items-center justify-between rounded-xl border p-4 text-left transition",
                                                active
                                                    ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                                                    : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200",
                                            ].join(
                                                " ",
                                            )}
                                        >
                                            <span className="text-sm font-semibold">
                                                {
                                                    category.nome
                                                }
                                            </span>

                                            <span
                                                className={[
                                                    "flex h-6 w-6 items-center justify-center rounded-full border",
                                                    active
                                                        ? "border-indigo-600 bg-indigo-600 text-white"
                                                        : "border-slate-300 text-transparent",
                                                ].join(
                                                    " ",
                                                )}
                                            >
                                                <Check className="h-3.5 w-3.5" />
                                            </span>
                                        </button>
                                    );
                                },
                            )}
                        </div>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                        <h2 className="font-semibold text-slate-900">
                            SEO do artigo
                        </h2>

                        <div className="mt-5 grid gap-5">
                            <Field
                                label="SEO title"
                                value={
                                    form.seo_title
                                }
                                helper={`${form.seo_title.length}/255`}
                                onChange={(
                                    value,
                                ) =>
                                    change(
                                        setForm,
                                        "seo_title",
                                        value,
                                    )
                                }
                            />

                            <TextArea
                                label="SEO description"
                                value={
                                    form.seo_description
                                }
                                helper={`${form.seo_description.length}/500`}
                                onChange={(
                                    value,
                                ) =>
                                    change(
                                        setForm,
                                        "seo_description",
                                        value,
                                    )
                                }
                            />

                            <Field
                                label="Canonical URL"
                                value={
                                    form.canonical_url
                                }
                                placeholder="Deixe vazio para usar a URL do artigo"
                                onChange={(
                                    value,
                                ) =>
                                    change(
                                        setForm,
                                        "canonical_url",
                                        value,
                                    )
                                }
                            />

                            <Field
                                label="Imagem social específica"
                                value={
                                    form.og_image_path
                                }
                                placeholder="Opcional. Se vazio, usa a destacada ou a imagem social global."
                                onChange={(
                                    value,
                                ) =>
                                    change(
                                        setForm,
                                        "og_image_path",
                                        value,
                                    )
                                }
                            />
                        </div>
                    </section>
                </div>

                <aside className="space-y-6">
                    <section className="rounded-2xl border border-slate-200 bg-white p-5">
                        <h2 className="font-semibold text-slate-900">
                            Publicação
                        </h2>

                        <div className="mt-5 space-y-5">
                            <Select
                                label="Tipo"
                                value={
                                    form.tipo
                                }
                                options={[
                                    [
                                        "artigo",
                                        "Artigo",
                                    ],
                                    [
                                        "noticia",
                                        "Notícia",
                                    ],
                                ]}
                                onChange={(
                                    value,
                                ) =>
                                    change(
                                        setForm,
                                        "tipo",
                                        value,
                                    )
                                }
                            />

                            <Select
                                label="Estado"
                                value={
                                    form.status
                                }
                                options={[
                                    [
                                        "rascunho",
                                        "Rascunho",
                                    ],
                                    [
                                        "agendado",
                                        "Agendado",
                                    ],
                                    [
                                        "publicado",
                                        "Publicado",
                                    ],
                                    [
                                        "arquivado",
                                        "Arquivado",
                                    ],
                                ]}
                                onChange={(
                                    value,
                                ) =>
                                    change(
                                        setForm,
                                        "status",
                                        value,
                                    )
                                }
                            />

                            <label className="block">
                                <span className="text-sm font-semibold text-slate-700">
                                    Publicar em
                                </span>

                                <input
                                    type="datetime-local"
                                    value={
                                        form.publicado_em
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        change(
                                            setForm,
                                            "publicado_em",
                                            event
                                                .target
                                                .value,
                                        )
                                    }
                                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                                />
                            </label>

                            <Field
                                label="Tags"
                                value={
                                    form.tags
                                }
                                placeholder="TVDE, gestão, frotas"
                                onChange={(
                                    value,
                                ) =>
                                    change(
                                        setForm,
                                        "tags",
                                        value,
                                    )
                                }
                            />
                        </div>
                    </section>

                    {!isNew &&
                        post && (
                            <section className="rounded-2xl border border-slate-200 bg-white p-5">
                                <h2 className="font-semibold text-slate-900">
                                    Desempenho
                                </h2>

                                <div className="mt-5 space-y-4 text-sm">
                                    <Info
                                        label="Palavras"
                                        value={
                                            post.numero_palavras
                                        }
                                    />

                                    <Info
                                        label="Última visualização"
                                        value={
                                            post.last_view_at
                                                ? new Date(
                                                      post.last_view_at,
                                                  ).toLocaleString(
                                                      "pt-PT",
                                                  )
                                                : "Ainda sem visualizações"
                                        }
                                    />

                                    <Info
                                        label="Atualizado"
                                        value={new Date(
                                            post.updated_at,
                                        ).toLocaleString(
                                            "pt-PT",
                                        )}
                                    />
                                </div>
                            </section>
                        )}

                    <section className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
                        <h2 className="font-semibold text-indigo-950">
                            Checklist editorial
                        </h2>

                        <div className="mt-4 space-y-3">
                            <Checklist
                                ok={
                                    form.titulo
                                        .trim()
                                        .length >
                                    10
                                }
                                text="Título definido"
                            />

                            <Checklist
                                ok={
                                    form.resumo
                                        .trim()
                                        .length >
                                    30
                                }
                                text="Resumo preenchido"
                            />

                            <Checklist
                                ok={
                                    form.conteudo
                                        .length >
                                    300
                                }
                                text="Conteúdo desenvolvido"
                            />

                            <Checklist
                                ok={
                                    form.categoria_ids
                                        .length >
                                    0
                                }
                                text="Categoria selecionada"
                            />

                            <Checklist
                                ok={
                                    !!form.imagem_destaque_path
                                }
                                text="Imagem destacada"
                            />

                            <Checklist
                                ok={
                                    !!form.seo_title &&
                                    !!form.seo_description
                                }
                                text="SEO preenchido"
                            />
                        </div>
                    </section>
                </aside>
            </div>
        </form>
    );
}

function ImageUpload({
    label,
    value,
    onUpload,
}: {
    label: string;
    value: string;
    onUpload: (
        file: File,
    ) => Promise<void>;
}) {
    const preview =
        mediaUrl(
            value,
        );

    return (
        <div>
            <div className="text-sm font-semibold text-slate-700">
                {label}
            </div>

            <div className="mt-2 overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50">
                {preview ? (
                    <img
                        src={preview}
                        alt=""
                        className="aspect-[16/9] w-full object-cover"
                    />
                ) : (
                    <div className="flex aspect-[16/9] items-center justify-center text-slate-400">
                        <ImagePlus className="h-8 w-8" />
                    </div>
                )}

                <label className="flex cursor-pointer items-center justify-center border-t border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-indigo-600 hover:bg-indigo-50">
                    <ImagePlus className="mr-2 h-4 w-4" />

                    {preview
                        ? "Substituir imagem"
                        : "Anexar imagem"}

                    <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={async (
                            event,
                        ) => {
                            const file =
                                event.target
                                    .files?.[0];

                            event.target.value =
                                "";

                            if (!file) {
                                return;
                            }

                            await onUpload(
                                file,
                            );
                        }}
                    />
                </label>
            </div>
        </div>
    );
}

function mediaUrl(
    path: string,
) {
    if (!path) {
        return "";
    }

    if (
        /^https?:\/\//i.test(
            path,
        )
    ) {
        return path;
    }

    return appUrl(
        `storage/${path.replace(
            /^\/?storage\//,
            "",
        )}`,
    );
}

function change(
    setter: React.Dispatch<
        React.SetStateAction<FormData>
    >,
    key: keyof FormData,
    value: string,
) {
    setter((current) => ({
        ...current,
        [key]: value,
    }));
}

function toDateTimeLocal(
    value:
        | string
        | null,
) {
    if (!value) {
        return "";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
        return "";
    }

    const pad = (
        value: number,
    ) =>
        String(value).padStart(
            2,
            "0",
        );

    return `${date.getFullYear()}-${pad(
        date.getMonth() + 1,
    )}-${pad(
        date.getDate(),
    )}T${pad(
        date.getHours(),
    )}:${pad(
        date.getMinutes(),
    )}`;
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
            <div className="flex items-center justify-between gap-3">
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
    onChange,
}: {
    label: string;
    value: string;
    helper?: string;
    onChange: (
        value: string,
    ) => void;
}) {
    return (
        <label className="block">
            <div className="flex items-center justify-between gap-3">
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
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
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

function Metric({
    label,
    value,
    icon: Icon,
}: {
    label: string;
    value:
        | string
        | number;
    icon: typeof Eye;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <p className="text-sm text-slate-500">
                        {label}
                    </p>

                    <p className="mt-2 text-2xl font-bold text-slate-950">
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

function Info({
    label,
    value,
}: {
    label: string;
    value:
        | string
        | number;
}) {
    return (
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
            <span className="text-slate-500">
                {label}
            </span>

            <span className="text-right font-semibold text-slate-800">
                {value}
            </span>
        </div>
    );
}

function Checklist({
    ok,
    text,
}: {
    ok: boolean;
    text: string;
}) {
    return (
        <div className="flex items-center gap-3 text-sm">
            <span
                className={[
                    "flex h-6 w-6 items-center justify-center rounded-full",
                    ok
                        ? "bg-emerald-500 text-white"
                        : "bg-white text-slate-300",
                ].join(
                    " ",
                )}
            >
                <Check className="h-3.5 w-3.5" />
            </span>

            <span
                className={
                    ok
                        ? "font-medium text-slate-800"
                        : "text-slate-500"
                }
            >
                {text}
            </span>
        </div>
    );
}