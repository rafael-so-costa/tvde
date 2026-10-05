import {
    ExternalLink,
    Image as ImageIcon,
    LoaderCircle,
    MessageCircle,
    MousePointerClick,
    Plus,
    Save,
    Trash2,
    Video,
} from "lucide-react";

import {
    useMutation,
    useQueryClient,
} from "@tanstack/react-query";

import {
    useMemo,
    useState,
} from "react";

import api from "../../lib/api";

import type {
    AdCreative,
} from "../../types/backofficeAds";

interface Props {
    campaignId: string;
    creatives: AdCreative[];
}

const emptyForm = {
    type: "native_card",
    media_type: "image",
    name: "",
    headline: "",
    body: "",
    cta_label: "Saber mais",

    destination_type: "website",

    target_url: "",
    phone: "",
    whatsapp: "",
    whatsapp_message: "",

    video_url: "",
    alt_text: "",

    active: true,
    sort_order: 0,
};

export default function AdCreativeManager({
    campaignId,
    creatives,
}: Props) {
    const queryClient =
        useQueryClient();

    const [editingId, setEditingId] =
        useState<string | null>(
            null,
        );

    const [form, setForm] =
        useState(emptyForm);

    const [image, setImage] =
        useState<File | null>(
            null,
        );

    const [
        mobileImage,
        setMobileImage,
    ] = useState<File | null>(
        null,
    );

    const [video, setVideo] =
        useState<File | null>(
            null,
        );

    const editingCreative =
        useMemo(
            () =>
                creatives.find(
                    (creative) =>
                        creative.id ===
                        editingId,
                ) ?? null,
            [
                creatives,
                editingId,
            ],
        );

    const saveMutation =
        useMutation({
            mutationFn:
                async () => {
                    const data =
                        new FormData();

                    Object.entries(
                        form,
                    ).forEach(
                        ([
                            key,
                            value,
                        ]) => {
                            data.append(
                                key,
                                typeof value ===
                                    "boolean"
                                    ? value
                                        ? "1"
                                        : "0"
                                    : String(
                                          value ??
                                              "",
                                      ),
                            );
                        },
                    );

                    if (image) {
                        data.append(
                            "image",
                            image,
                        );
                    }

                    if (
                        mobileImage
                    ) {
                        data.append(
                            "mobile_image",
                            mobileImage,
                        );
                    }

                    if (video) {
                        data.append(
                            "video",
                            video,
                        );
                    }

                    if (
                        editingId
                    ) {
                        return api.post(
                            `/api/backoffice/ads/creatives/${editingId}`,
                            data,
                            {
                                headers: {
                                    "Content-Type":
                                        "multipart/form-data",
                                },
                            },
                        );
                    }

                    return api.post(
                        `/api/backoffice/ads/campaigns/${campaignId}/creatives`,
                        data,
                        {
                            headers: {
                                "Content-Type":
                                    "multipart/form-data",
                            },
                        },
                    );
                },

            onSuccess:
                async () => {
                    reset();

                    await queryClient.invalidateQueries(
                        {
                            queryKey:
                                [
                                    "backoffice",
                                    "ads",
                                    "campaign",
                                    campaignId,
                                ],
                        },
                    );
                },
        });

    const deleteMutation =
        useMutation({
            mutationFn:
                async (
                    id: string,
                ) =>
                    api.delete(
                        `/api/backoffice/ads/creatives/${id}`,
                    ),

            onSuccess:
                async () => {
                    reset();

                    await queryClient.invalidateQueries(
                        {
                            queryKey:
                                [
                                    "backoffice",
                                    "ads",
                                    "campaign",
                                    campaignId,
                                ],
                        },
                    );
                },
        });

    function edit(
        creative: AdCreative,
    ) {
        setEditingId(
            creative.id,
        );

        setForm({
            type: creative.type,
            media_type:
                creative.media_type,
            name: creative.name,
            headline:
                creative.headline,
            body:
                creative.body ?? "",
            cta_label:
                creative.cta_label ??
                "",

            destination_type:
                creative.destination_type,

            target_url:
                creative.destination_type ===
                "website"
                    ? creative.target_url ??
                      ""
                    : "",

            phone:
                creative.phone ??
                "",

            whatsapp:
                creative.whatsapp ??
                "",

            whatsapp_message:
                creative.whatsapp_message ??
                "",

            video_url:
                creative.video_url ??
                "",

            alt_text:
                creative.alt_text ??
                "",

            active:
                creative.active,

            sort_order:
                creative.sort_order,
        });

        setImage(null);
        setMobileImage(null);
        setVideo(null);
    }

    function reset() {
        setEditingId(null);

        setForm(
            emptyForm,
        );

        setImage(null);
        setMobileImage(null);
        setVideo(null);
    }

    return (
        <section className="space-y-5">
            <div>
                <h3 className="text-lg font-semibold text-slate-900">
                    Criativos
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                    Imagens, vídeos,
                    mensagem, CTA e
                    destino utilizados na
                    campanha.
                </p>
            </div>

            {creatives.length >
                0 && (
                <div className="grid gap-4 xl:grid-cols-2">
                    {creatives.map(
                        (
                            creative,
                        ) => (
                            <CreativeCard
                                key={
                                    creative.id
                                }
                                creative={
                                    creative
                                }
                                onEdit={() =>
                                    edit(
                                        creative,
                                    )
                                }
                                onDelete={() =>
                                    deleteMutation.mutate(
                                        creative.id,
                                    )
                                }
                            />
                        ),
                    )}
                </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex items-center justify-between gap-3">
                    <h4 className="font-semibold text-slate-900">
                        {editingCreative
                            ? `Editar: ${editingCreative.name}`
                            : "Novo criativo"}
                    </h4>

                    {editingId && (
                        <button
                            type="button"
                            onClick={
                                reset
                            }
                            className="text-sm font-semibold text-slate-500"
                        >
                            Cancelar
                        </button>
                    )}
                </div>

                <div className="mt-5 grid gap-5 lg:grid-cols-2">
                    <Field label="Nome interno">
                        <input
                            value={
                                form.name
                            }
                            onChange={(
                                event,
                            ) =>
                                setForm({
                                    ...form,
                                    name: event
                                        .target
                                        .value,
                                })
                            }
                            className="input-class"
                        />
                    </Field>

                    <Field label="Formato">
                        <select
                            value={
                                form.type
                            }
                            onChange={(
                                event,
                            ) =>
                                setForm({
                                    ...form,
                                    type: event
                                        .target
                                        .value,
                                })
                            }
                            className="input-class"
                        >
                            <option value="native_card">
                                Card nativo
                            </option>

                            <option value="banner">
                                Banner
                            </option>

                            <option value="offer">
                                Oferta
                            </option>

                            <option value="sponsorship">
                                Patrocínio
                            </option>
                        </select>
                    </Field>

                    <Field label="Título visível">
                        <input
                            value={
                                form.headline
                            }
                            onChange={(
                                event,
                            ) =>
                                setForm({
                                    ...form,
                                    headline:
                                        event
                                            .target
                                            .value,
                                })
                            }
                            className="input-class"
                        />
                    </Field>

                    <Field label="CTA">
                        <input
                            value={
                                form.cta_label
                            }
                            onChange={(
                                event,
                            ) =>
                                setForm({
                                    ...form,
                                    cta_label:
                                        event
                                            .target
                                            .value,
                                })
                            }
                            placeholder="Saber mais"
                            className="input-class"
                        />
                    </Field>

                    <div className="lg:col-span-2">
                        <Field label="Texto">
                            <textarea
                                value={
                                    form.body
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setForm({
                                        ...form,
                                        body: event
                                            .target
                                            .value,
                                    })
                                }
                                rows={
                                    4
                                }
                                className="textarea-class"
                            />
                        </Field>
                    </div>

                    <Field label="Mídia">
                        <select
                            value={
                                form.media_type
                            }
                            onChange={(
                                event,
                            ) =>
                                setForm({
                                    ...form,
                                    media_type:
                                        event
                                            .target
                                            .value,
                                })
                            }
                            className="input-class"
                        >
                            <option value="image">
                                Imagem
                            </option>

                            <option value="video">
                                Vídeo
                            </option>

                            <option value="none">
                                Sem mídia
                            </option>
                        </select>
                    </Field>

                    <Field label="Texto alternativo">
                        <input
                            value={
                                form.alt_text
                            }
                            onChange={(
                                event,
                            ) =>
                                setForm({
                                    ...form,
                                    alt_text:
                                        event
                                            .target
                                            .value,
                                })
                            }
                            className="input-class"
                        />
                    </Field>

                    {form.media_type ===
                        "image" && (
                        <>
                            <Field label="Imagem desktop">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(
                                        event,
                                    ) =>
                                        setImage(
                                            event
                                                .target
                                                .files?.[0] ??
                                                null,
                                        )
                                    }
                                    className="file-class"
                                />
                            </Field>

                            <Field label="Imagem mobile">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(
                                        event,
                                    ) =>
                                        setMobileImage(
                                            event
                                                .target
                                                .files?.[0] ??
                                                null,
                                        )
                                    }
                                    className="file-class"
                                />
                            </Field>
                        </>
                    )}

                    {form.media_type ===
                        "video" && (
                        <>
                            <Field label="Enviar vídeo">
                                <input
                                    type="file"
                                    accept="video/mp4,video/webm"
                                    onChange={(
                                        event,
                                    ) =>
                                        setVideo(
                                            event
                                                .target
                                                .files?.[0] ??
                                                null,
                                        )
                                    }
                                    className="file-class"
                                />
                            </Field>

                            <Field label="Ou URL do vídeo">
                                <input
                                    value={
                                        form.video_url
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setForm({
                                            ...form,
                                            video_url:
                                                event
                                                    .target
                                                    .value,
                                        })
                                    }
                                    placeholder="https://..."
                                    className="input-class"
                                />
                            </Field>
                        </>
                    )}

                    <Field label="Destino">
                        <select
                            value={
                                form.destination_type
                            }
                            onChange={(
                                event,
                            ) =>
                                setForm({
                                    ...form,
                                    destination_type:
                                        event
                                            .target
                                            .value,
                                })
                            }
                            className="input-class"
                        >
                            <option value="website">
                                Website
                            </option>

                            <option value="whatsapp">
                                WhatsApp
                            </option>

                            <option value="phone">
                                Telefone
                            </option>

                            <option value="none">
                                Sem destino
                            </option>
                        </select>
                    </Field>

                    {form.destination_type ===
                        "website" && (
                        <Field label="URL de destino">
                            <input
                                value={
                                    form.target_url
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setForm({
                                        ...form,
                                        target_url:
                                            event
                                                .target
                                                .value,
                                    })
                                }
                                placeholder="https://..."
                                className="input-class"
                            />
                        </Field>
                    )}

                    {form.destination_type ===
                        "whatsapp" && (
                        <>
                            <Field label="WhatsApp">
                                <input
                                    value={
                                        form.whatsapp
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setForm({
                                            ...form,
                                            whatsapp:
                                                event
                                                    .target
                                                    .value,
                                        })
                                    }
                                    placeholder="351912345678"
                                    className="input-class"
                                />
                            </Field>

                            <div className="lg:col-span-2">
                                <Field label="Mensagem inicial do WhatsApp">
                                    <textarea
                                        value={
                                            form.whatsapp_message
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setForm({
                                                ...form,
                                                whatsapp_message:
                                                    event
                                                        .target
                                                        .value,
                                            })
                                        }
                                        rows={
                                            3
                                        }
                                        placeholder="Olá, vi o seu anúncio no FrotaPro..."
                                        className="textarea-class"
                                    />
                                </Field>
                            </div>
                        </>
                    )}

                    {form.destination_type ===
                        "phone" && (
                        <Field label="Telefone">
                            <input
                                value={
                                    form.phone
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setForm({
                                        ...form,
                                        phone: event
                                            .target
                                            .value,
                                    })
                                }
                                placeholder="351211234567"
                                className="input-class"
                            />
                        </Field>
                    )}

                    <Field label="Ordem">
                        <input
                            type="number"
                            min={
                                0
                            }
                            value={
                                form.sort_order
                            }
                            onChange={(
                                event,
                            ) =>
                                setForm({
                                    ...form,
                                    sort_order:
                                        Number(
                                            event
                                                .target
                                                .value,
                                        ),
                                })
                            }
                            className="input-class"
                        />
                    </Field>

                    <Field label="Estado">
                        <label className="flex h-11 items-center gap-3 rounded-xl border border-slate-200 px-3">
                            <input
                                type="checkbox"
                                checked={
                                    form.active
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setForm({
                                        ...form,
                                        active: event
                                            .target
                                            .checked,
                                    })
                                }
                            />

                            Criativo ativo
                        </label>
                    </Field>
                </div>

                <div className="mt-5">
                    <button
                        type="button"
                        disabled={
                            saveMutation.isPending
                        }
                        onClick={() =>
                            saveMutation.mutate()
                        }
                        className="inline-flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                        {saveMutation.isPending ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : editingId ? (
                            <Save className="h-4 w-4" />
                        ) : (
                            <Plus className="h-4 w-4" />
                        )}

                        {editingId
                            ? "Guardar criativo"
                            : "Adicionar criativo"}
                    </button>
                </div>
            </div>
        </section>
    );
}

function CreativeCard({
    creative,
    onEdit,
    onDelete,
}: {
    creative: AdCreative;
    onEdit: () => void;
    onDelete: () => void;
}) {
    return (
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {creative.media_type ===
                "image" &&
                creative.image_url && (
                    <img
                        src={
                            creative.image_url
                        }
                        alt={
                            creative.alt_text ??
                            creative.headline
                        }
                        className="aspect-[16/7] w-full object-cover"
                    />
                )}

            {creative.media_type ===
                "video" &&
                creative.video_url && (
                    <video
                        src={
                            creative.video_url
                        }
                        controls
                        className="aspect-video w-full bg-black object-contain"
                    />
                )}

            <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                            {
                                creative.name
                            }
                        </div>

                        <h4 className="mt-1 font-semibold text-slate-900">
                            {
                                creative.headline
                            }
                        </h4>
                    </div>

                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                        {
                            creative.type
                        }
                    </span>
                </div>

                {creative.body && (
                    <p className="mt-3 text-sm text-slate-500">
                        {
                            creative.body
                        }
                    </p>
                )}

                {creative.target_url && (
                    <a
                        href={
                            creative.target_url
                        }
                        target={
                            creative.destination_type ===
                            "phone"
                                ? undefined
                                : "_blank"
                        }
                        rel="noreferrer"
                        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600"
                    >
                        {creative.destination_type ===
                        "whatsapp" ? (
                            <MessageCircle className="h-4 w-4" />
                        ) : (
                            <ExternalLink className="h-4 w-4" />
                        )}

                        {creative.cta_label ??
                            "Abrir"}
                    </a>
                )}

                <div className="mt-5 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4 text-center">
                    <Stat
                        value={
                            creative.metrics
                                .impressions
                        }
                        label="Impressões"
                    />

                    <Stat
                        value={
                            creative.metrics
                                .clicks
                        }
                        label="Cliques"
                    />

                    <Stat
                        value={`${creative.metrics.ctr.toFixed(
                            2,
                        )}%`}
                        label="CTR"
                    />
                </div>

                <div className="mt-4 flex gap-2">
                    <button
                        type="button"
                        onClick={
                            onEdit
                        }
                        className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
                    >
                        Editar
                    </button>

                    <button
                        type="button"
                        onClick={
                            onDelete
                        }
                        className="inline-flex items-center justify-center rounded-xl border border-red-200 px-3 text-red-600"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </article>
    );
}

function Stat({
    value,
    label,
}: {
    value: string | number;
    label: string;
}) {
    return (
        <div>
            <div className="font-semibold text-slate-900">
                {typeof value ===
                "number"
                    ? value.toLocaleString(
                          "pt-PT",
                      )
                    : value}
            </div>

            <div className="mt-0.5 text-xs text-slate-400">
                {label}
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
        <label>
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
                {label}
            </span>

            {children}
        </label>
    );
}
