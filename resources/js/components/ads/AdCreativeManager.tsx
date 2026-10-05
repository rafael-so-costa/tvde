import {
    ExternalLink,
    Image as ImageIcon,
    Info,
    LoaderCircle,
    MessageCircle,
    MonitorSmartphone,
    Plus,
    Save,
    Trash2,
    Type,
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

const inputClass =
    "h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100";

const textareaClass =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100";

const fileClass =
    "block min-h-12 w-full cursor-pointer rounded-xl border border-slate-300 bg-white p-2.5 text-sm text-slate-600 shadow-sm file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:border-indigo-300 hover:file:bg-indigo-100";

const creativeFormats = [
    {
        value: "native_card",
        label: "Card nativo",
        description:
            "Formato integrado ao conteúdo do portal. Ideal para dashboards, listagens e blocos patrocinados.",
        placement:
            "Dashboards, portais e listagens.",
        desktop: "1200 × 675 px",
        mobile: "1080 × 1080 px",
        ratio: "16:9 / 1:1",
    },
    {
        value: "banner",
        label: "Banner",
        description:
            "Formato horizontal e compacto para posições de destaque sem interferir com o conteúdo principal.",
        placement:
            "Topo, entre secções ou final da página.",
        desktop: "1200 × 300 px",
        mobile: "1080 × 540 px",
        ratio: "4:1 / 2:1",
    },
    {
        value: "offer",
        label: "Oferta",
        description:
            "Formato orientado para promoções, descontos, vantagens e chamadas comerciais.",
        placement:
            "Marketplace, dashboards e áreas contextuais.",
        desktop: "1200 × 675 px",
        mobile: "1080 × 1080 px",
        ratio: "16:9 / 1:1",
    },
    {
        value: "sponsorship",
        label: "Patrocínio",
        description:
            "Formato institucional para parceiros estratégicos, branding e campanhas FrotaPro.",
        placement:
            "Áreas premium e destaques institucionais.",
        desktop: "1200 × 675 px",
        mobile: "1080 × 1080 px",
        ratio: "16:9 / 1:1",
    },
];

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

    const selectedFormat =
        creativeFormats.find(
            (format) =>
                format.value ===
                form.type,
        ) ??
        creativeFormats[0];

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
                creative.body ??
                "",
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
        setForm(emptyForm);
        setImage(null);
        setMobileImage(null);
        setVideo(null);
    }

    return (
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5 sm:px-7">
                <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                        <ImageIcon className="h-5 w-5" />
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-slate-950">
                            Criativos da campanha
                        </h2>

                        <p className="mt-1 text-sm leading-6 text-slate-500">
                            Configure a apresentação visual, mensagem,
                            chamada para ação e destino de cada anúncio.
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-7 p-6 sm:p-7">
                {creatives.length >
                    0 && (
                    <div>
                        <h3 className="mb-4 font-semibold text-slate-900">
                            Criativos existentes
                        </h3>

                        <div className="grid gap-5 xl:grid-cols-2">
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
                                        onDelete={() => {
                                            if (
                                                window.confirm(
                                                    "Eliminar este criativo?",
                                                )
                                            ) {
                                                deleteMutation.mutate(
                                                    creative.id,
                                                );
                                            }
                                        }}
                                    />
                                ),
                            )}
                        </div>
                    </div>
                )}

                <div className="border-t border-slate-200 pt-7">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                        <div>
                            <h3 className="text-lg font-bold text-slate-950">
                                {editingCreative
                                    ? `Editar criativo — ${editingCreative.name}`
                                    : "Adicionar novo criativo"}
                            </h3>

                            <p className="mt-1 text-sm leading-6 text-slate-500">
                                Uma campanha pode utilizar vários criativos
                                para diferentes formatos e zonas.
                            </p>
                        </div>

                        {editingId && (
                            <button
                                type="button"
                                onClick={
                                    reset
                                }
                                className="text-sm font-semibold text-slate-500 transition hover:text-slate-800"
                            >
                                Cancelar edição
                            </button>
                        )}
                    </div>

                    <div className="mt-7">
                        <FormSection
                            icon={
                                MonitorSmartphone
                            }
                            title="1. Formato do anúncio"
                            description="Escolha o formato conforme o local e objetivo da campanha."
                        >
                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                {creativeFormats.map(
                                    (
                                        format,
                                    ) => {
                                        const selected =
                                            form.type ===
                                            format.value;

                                        return (
                                            <button
                                                key={
                                                    format.value
                                                }
                                                type="button"
                                                onClick={() =>
                                                    setForm({
                                                        ...form,
                                                        type: format.value,
                                                    })
                                                }
                                                className={[
                                                    "rounded-2xl border p-4 text-left transition",
                                                    selected
                                                        ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100"
                                                        : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50",
                                                ].join(
                                                    " ",
                                                )}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <span className="font-semibold text-slate-900">
                                                        {
                                                            format.label
                                                        }
                                                    </span>

                                                    <span
                                                        className={[
                                                            "h-3 w-3 rounded-full border-2",
                                                            selected
                                                                ? "border-indigo-600 bg-indigo-600"
                                                                : "border-slate-300 bg-white",
                                                        ].join(
                                                            " ",
                                                        )}
                                                    />
                                                </div>

                                                <p className="mt-3 text-sm leading-5 text-slate-500">
                                                    {
                                                        format.description
                                                    }
                                                </p>

                                                <div className="mt-4 space-y-1 border-t border-slate-200 pt-3 text-xs">
                                                    <div className="text-slate-500">
                                                        <span className="font-semibold text-slate-700">
                                                            Onde:
                                                        </span>{" "}
                                                        {
                                                            format.placement
                                                        }
                                                    </div>

                                                    <div className="text-slate-500">
                                                        <span className="font-semibold text-slate-700">
                                                            Desktop:
                                                        </span>{" "}
                                                        {
                                                            format.desktop
                                                        }
                                                    </div>

                                                    <div className="text-slate-500">
                                                        <span className="font-semibold text-slate-700">
                                                            Mobile:
                                                        </span>{" "}
                                                        {
                                                            format.mobile
                                                        }
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    },
                                )}
                            </div>
                        </FormSection>

                        <FormSection
                            icon={Type}
                            title="2. Conteúdo do anúncio"
                            description="Defina como o anúncio será identificado e qual mensagem será mostrada."
                        >
                            <div className="grid gap-5 lg:grid-cols-2">
                                <Field
                                    label="Nome interno"
                                    hint="Usado apenas no backoffice. Não será mostrado ao público."
                                >
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
                                        placeholder="Ex.: Oficina XPTO — Criativo A"
                                        className={
                                            inputClass
                                        }
                                    />
                                </Field>

                                <Field
                                    label="CTA"
                                    hint="Texto do botão ou ligação."
                                >
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
                                        placeholder="Ex.: Pedir orçamento"
                                        className={
                                            inputClass
                                        }
                                    />
                                </Field>

                                <div className="lg:col-span-2">
                                    <Field
                                        label="Título visível"
                                        hint="Mensagem principal apresentada ao utilizador."
                                    >
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
                                            placeholder="Ex.: 10% de desconto na revisão do seu TVDE"
                                            className={
                                                inputClass
                                            }
                                        />
                                    </Field>
                                </div>

                                <div className="lg:col-span-2">
                                    <Field
                                        label="Texto do anúncio"
                                        hint="Explique a oferta ou benefício de forma curta e objetiva."
                                    >
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
                                            placeholder="Ex.: Motoristas FrotaPro têm 10% de desconto em revisões e manutenção..."
                                            className={
                                                textareaClass
                                            }
                                        />
                                    </Field>
                                </div>
                            </div>
                        </FormSection>

                        <FormSection
                            icon={
                                ImageIcon
                            }
                            title="3. Imagem ou vídeo"
                            description={`Para ${selectedFormat.label}, recomendamos ${selectedFormat.desktop} no desktop e ${selectedFormat.mobile} no mobile.`}
                        >
                            <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
                                <div className="space-y-3">
                                    <MediaOption
                                        icon={
                                            ImageIcon
                                        }
                                        label="Imagem"
                                        description="Imagem desktop e opcionalmente versão mobile."
                                        selected={
                                            form.media_type ===
                                            "image"
                                        }
                                        onClick={() =>
                                            setForm({
                                                ...form,
                                                media_type:
                                                    "image",
                                            })
                                        }
                                    />

                                    <MediaOption
                                        icon={
                                            Video
                                        }
                                        label="Vídeo"
                                        description="MP4/WebM ou URL de vídeo."
                                        selected={
                                            form.media_type ===
                                            "video"
                                        }
                                        onClick={() =>
                                            setForm({
                                                ...form,
                                                media_type:
                                                    "video",
                                            })
                                        }
                                    />

                                    <MediaOption
                                        icon={
                                            Type
                                        }
                                        label="Sem mídia"
                                        description="Somente texto e CTA."
                                        selected={
                                            form.media_type ===
                                            "none"
                                        }
                                        onClick={() =>
                                            setForm({
                                                ...form,
                                                media_type:
                                                    "none",
                                            })
                                        }
                                    />
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                                    {form.media_type ===
                                        "image" && (
                                        <div className="grid gap-5 md:grid-cols-2">
                                            <Field
                                                label="Imagem desktop"
                                                hint={`Recomendado: ${selectedFormat.desktop}. Máximo atual: 5 MB.`}
                                            >
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
                                                    className={
                                                        fileClass
                                                    }
                                                />

                                                {image && (
                                                    <SelectedFile
                                                        name={
                                                            image.name
                                                        }
                                                    />
                                                )}
                                            </Field>

                                            <Field
                                                label="Imagem mobile"
                                                hint={`Recomendado: ${selectedFormat.mobile}. Opcional.`}
                                            >
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
                                                    className={
                                                        fileClass
                                                    }
                                                />

                                                {mobileImage && (
                                                    <SelectedFile
                                                        name={
                                                            mobileImage.name
                                                        }
                                                    />
                                                )}
                                            </Field>

                                            <div className="md:col-span-2">
                                                <Field
                                                    label="Texto alternativo"
                                                    hint="Descreva a imagem para acessibilidade."
                                                >
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
                                                        placeholder="Ex.: Mecânico a efetuar revisão num veículo TVDE"
                                                        className={
                                                            inputClass
                                                        }
                                                    />
                                                </Field>
                                            </div>
                                        </div>
                                    )}

                                    {form.media_type ===
                                        "video" && (
                                        <div className="grid gap-5 md:grid-cols-2">
                                            <Field
                                                label="Enviar vídeo"
                                                hint="MP4 ou WebM. Máximo atual: 100 MB."
                                            >
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
                                                    className={
                                                        fileClass
                                                    }
                                                />

                                                {video && (
                                                    <SelectedFile
                                                        name={
                                                            video.name
                                                        }
                                                    />
                                                )}
                                            </Field>

                                            <Field
                                                label="Ou URL do vídeo"
                                                hint="Utilize quando o vídeo estiver hospedado externamente."
                                            >
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
                                                    className={
                                                        inputClass
                                                    }
                                                />
                                            </Field>

                                            <div className="md:col-span-2">
                                                <Field
                                                    label="Texto alternativo"
                                                    hint="Descrição textual do conteúdo do vídeo."
                                                >
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
                                                        className={
                                                            inputClass
                                                        }
                                                    />
                                                </Field>
                                            </div>
                                        </div>
                                    )}

                                    {form.media_type ===
                                        "none" && (
                                        <div className="flex min-h-36 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 text-center">
                                            <div>
                                                <Type className="mx-auto h-7 w-7 text-slate-400" />

                                                <p className="mt-3 text-sm font-semibold text-slate-700">
                                                    Criativo sem mídia
                                                </p>

                                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                                    O anúncio utilizará apenas
                                                    título, texto e CTA.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </FormSection>

                        <FormSection
                            icon={
                                ExternalLink
                            }
                            title="4. Destino e ação"
                            description="Defina o que acontece quando o utilizador clica no anúncio."
                        >
                            <div className="grid gap-5 lg:grid-cols-2">
                                <Field
                                    label="Tipo de destino"
                                    hint="Escolha para onde o utilizador será encaminhado."
                                >
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
                                        className={
                                            inputClass
                                        }
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
                                    <Field
                                        label="URL de destino"
                                        hint="Utilize o endereço completo com https://."
                                    >
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
                                            placeholder="https://www.exemplo.pt/oferta"
                                            className={
                                                inputClass
                                            }
                                        />
                                    </Field>
                                )}

                                {form.destination_type ===
                                    "whatsapp" && (
                                    <>
                                        <Field
                                            label="Número WhatsApp"
                                            hint="Inclua o indicativo internacional. Ex.: 351912345678."
                                        >
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
                                                className={
                                                    inputClass
                                                }
                                            />
                                        </Field>

                                        <div className="lg:col-span-2">
                                            <Field
                                                label="Mensagem inicial do WhatsApp"
                                                hint="Será preenchida automaticamente ao abrir a conversa."
                                            >
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
                                                        4
                                                    }
                                                    placeholder="Olá, vi o seu anúncio no FrotaPro e gostaria de saber mais."
                                                    className={
                                                        textareaClass
                                                    }
                                                />
                                            </Field>
                                        </div>
                                    </>
                                )}

                                {form.destination_type ===
                                    "phone" && (
                                    <Field
                                        label="Telefone"
                                        hint="Inclua o indicativo internacional."
                                    >
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
                                            className={
                                                inputClass
                                            }
                                        />
                                    </Field>
                                )}

                                {form.destination_type ===
                                    "none" && (
                                    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 lg:col-span-2">
                                        <Info className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />

                                        <p className="text-sm leading-6 text-slate-600">
                                            O anúncio será apenas informativo e
                                            não terá ação ao clicar.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </FormSection>

                        <FormSection
                            icon={
                                Info
                            }
                            title="5. Configuração do criativo"
                            description="Opções administrativas para organização e ativação."
                        >
                            <div className="grid gap-5 lg:grid-cols-2">
                                <Field
                                    label="Ordem"
                                    hint="Define a prioridade visual entre os criativos da mesma campanha."
                                >
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
                                        className={
                                            inputClass
                                        }
                                    />
                                </Field>

                                <label className="flex cursor-pointer items-start gap-4 rounded-2xl border border-slate-300 bg-slate-50 p-5">
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
                                        className="mt-1 h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />

                                    <span>
                                        <span className="block font-semibold text-slate-900">
                                            Criativo ativo
                                        </span>

                                        <span className="mt-1 block text-sm leading-6 text-slate-500">
                                            Apenas criativos ativos poderão
                                            participar da distribuição da
                                            campanha.
                                        </span>
                                    </span>
                                </label>
                            </div>
                        </FormSection>
                    </div>

                    {saveMutation.isError && (
                        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            Não foi possível guardar o criativo. Confirme os
                            campos obrigatórios e tente novamente.
                        </div>
                    )}

                    <div className="mt-7 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-sm text-slate-500">
                            Formato selecionado:{" "}
                            <span className="font-semibold text-slate-700">
                                {selectedFormat.label}
                            </span>{" "}
                            · Desktop{" "}
                            <span className="font-semibold text-slate-700">
                                {selectedFormat.desktop}
                            </span>{" "}
                            · Mobile{" "}
                            <span className="font-semibold text-slate-700">
                                {selectedFormat.mobile}
                            </span>
                        </div>

                        <button
                            type="button"
                            disabled={
                                saveMutation.isPending
                            }
                            onClick={() =>
                                saveMutation.mutate()
                            }
                            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {saveMutation.isPending ? (
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                            ) : editingId ? (
                                <Save className="h-4 w-4" />
                            ) : (
                                <Plus className="h-4 w-4" />
                            )}

                            {editingId
                                ? "Guardar alterações"
                                : "Adicionar criativo"}
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}

function FormSection({
    icon: Icon,
    title,
    description,
    children,
}: {
    icon: typeof Info;
    title: string;
    description: string;
    children: React.ReactNode;
}) {
    return (
        <section className="border-b border-slate-200 py-7 first:pt-0 last:border-b-0 last:pb-0">
            <div className="mb-5 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <Icon className="h-5 w-5" />
                </div>

                <div>
                    <h4 className="font-bold text-slate-900">
                        {title}
                    </h4>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                        {description}
                    </p>
                </div>
            </div>

            {children}
        </section>
    );
}

function MediaOption({
    icon: Icon,
    label,
    description,
    selected,
    onClick,
}: {
    icon: typeof ImageIcon;
    label: string;
    description: string;
    selected: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={[
                "flex w-full items-start gap-3 rounded-xl border p-4 text-left transition",
                selected
                    ? "border-indigo-400 bg-indigo-50 ring-2 ring-indigo-100"
                    : "border-slate-200 bg-white hover:border-slate-300",
            ].join(" ")}
        >
            <div
                className={[
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    selected
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-500",
                ].join(" ")}
            >
                <Icon className="h-4 w-4" />
            </div>

            <span>
                <span className="block text-sm font-semibold text-slate-800">
                    {label}
                </span>

                <span className="mt-1 block text-xs leading-5 text-slate-500">
                    {description}
                </span>
            </span>
        </button>
    );
}

function SelectedFile({
    name,
}: {
    name: string;
}) {
    return (
        <div className="mt-2 truncate rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
            Selecionado: {name}
        </div>
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
    const format =
        creativeFormats.find(
            (item) =>
                item.value ===
                creative.type,
        );

    return (
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
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
                        className="aspect-video w-full bg-slate-100 object-cover"
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

            {creative.media_type ===
                "none" && (
                <div className="flex aspect-video items-center justify-center bg-slate-50">
                    <Type className="h-10 w-10 text-slate-300" />
                </div>
            )}

            <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                            {
                                creative.name
                            }
                        </div>

                        <h4 className="mt-1 text-lg font-semibold text-slate-900">
                            {
                                creative.headline
                            }
                        </h4>
                    </div>

                    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        {format?.label ??
                            creative.type}
                    </span>
                </div>

                {creative.body && (
                    <p className="mt-3 text-sm leading-6 text-slate-500">
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
                        className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-50 px-4 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
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

                <div className="mt-5 flex gap-2">
                    <button
                        type="button"
                        onClick={
                            onEdit
                        }
                        className="flex h-10 flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                        Editar
                    </button>

                    <button
                        type="button"
                        onClick={
                            onDelete
                        }
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 bg-white text-red-600 transition hover:bg-red-50"
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

            <div className="mt-1 text-xs text-slate-400">
                {label}
            </div>
        </div>
    );
}

function Field({
    label,
    hint,
    children,
}: {
    label: string;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-800">
                {label}
            </span>

            {children}

            {hint && (
                <span className="mt-2 block text-xs leading-5 text-slate-500">
                    {hint}
                </span>
            )}
        </label>
    );
}
