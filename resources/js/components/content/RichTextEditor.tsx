import {
    AlignCenter,
    AlignLeft,
    AlignRight,
    Bold,
    Heading2,
    Heading3,
    ImagePlus,
    Italic,
    Link2,
    List,
    ListOrdered,
    Minus,
    Quote,
    Redo2,
    Strikethrough,
    Underline as UnderlineIcon,
    Undo2,
} from "lucide-react";

import {
    useEffect,
    useRef,
    type ReactNode,
} from "react";

import {
    EditorContent,
    useEditor,
} from "@tiptap/react";

import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";

interface Props {
    value: string;

    onChange: (
        value: string,
    ) => void;

    onUploadImage: (
        file: File,
    ) => Promise<string>;
}

export default function RichTextEditor({
    value,
    onChange,
    onUploadImage,
}: Props) {
    const fileRef =
        useRef<HTMLInputElement>(
            null,
        );

    const editor =
        useEditor({
            extensions: [
                StarterKit,

                Underline,

                Link.configure({
                    openOnClick: false,

                    HTMLAttributes: {
                        rel:
                            "noopener noreferrer",

                        target:
                            "_blank",
                    },
                }),

                Image.configure({
                    allowBase64: false,
                }),

                Placeholder.configure({
                    placeholder:
                        "Escreva o conteúdo do artigo...",
                }),

                TextAlign.configure({
                    types: [
                        "heading",
                        "paragraph",
                    ],
                }),
            ],

            content:
                value,

            editorProps: {
                attributes: {
                    class:
                        "min-h-[420px] outline-none",
                },
            },

            onUpdate: ({
                editor,
            }) => {
                onChange(
                    editor.getHTML(),
                );
            },
        });

    useEffect(() => {
        if (
            !editor ||
            value ===
                editor.getHTML()
        ) {
            return;
        }

        editor.commands.setContent(
            value || "",
            {
                emitUpdate:
                    false,
            },
        );
    }, [
        editor,
        value,
    ]);

    if (!editor) {
        return null;
    }

    async function upload(
        file: File,
    ) {
        const url =
            await onUploadImage(
                file,
            );

        editor
            .chain()
            .focus()
            .setImage({
                src: url,
            })
            .run();
    }

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 p-2">
                <ToolButton
                    title="Negrito"
                    active={
                        editor.isActive(
                            "bold",
                        )
                    }
                    onClick={() =>
                        editor
                            .chain()
                            .focus()
                            .toggleBold()
                            .run()
                    }
                >
                    <Bold className="h-4 w-4" />
                </ToolButton>

                <ToolButton
                    title="Itálico"
                    active={
                        editor.isActive(
                            "italic",
                        )
                    }
                    onClick={() =>
                        editor
                            .chain()
                            .focus()
                            .toggleItalic()
                            .run()
                    }
                >
                    <Italic className="h-4 w-4" />
                </ToolButton>

                <ToolButton
                    title="Sublinhado"
                    active={
                        editor.isActive(
                            "underline",
                        )
                    }
                    onClick={() =>
                        editor
                            .chain()
                            .focus()
                            .toggleUnderline()
                            .run()
                    }
                >
                    <UnderlineIcon className="h-4 w-4" />
                </ToolButton>

                <ToolButton
                    title="Riscado"
                    active={
                        editor.isActive(
                            "strike",
                        )
                    }
                    onClick={() =>
                        editor
                            .chain()
                            .focus()
                            .toggleStrike()
                            .run()
                    }
                >
                    <Strikethrough className="h-4 w-4" />
                </ToolButton>

                <Separator />

                <ToolButton
                    title="Título H2"
                    active={
                        editor.isActive(
                            "heading",
                            {
                                level: 2,
                            },
                        )
                    }
                    onClick={() =>
                        editor
                            .chain()
                            .focus()
                            .toggleHeading({
                                level: 2,
                            })
                            .run()
                    }
                >
                    <Heading2 className="h-4 w-4" />
                </ToolButton>

                <ToolButton
                    title="Título H3"
                    active={
                        editor.isActive(
                            "heading",
                            {
                                level: 3,
                            },
                        )
                    }
                    onClick={() =>
                        editor
                            .chain()
                            .focus()
                            .toggleHeading({
                                level: 3,
                            })
                            .run()
                    }
                >
                    <Heading3 className="h-4 w-4" />
                </ToolButton>

                <Separator />

                <ToolButton
                    title="Lista"
                    active={
                        editor.isActive(
                            "bulletList",
                        )
                    }
                    onClick={() =>
                        editor
                            .chain()
                            .focus()
                            .toggleBulletList()
                            .run()
                    }
                >
                    <List className="h-4 w-4" />
                </ToolButton>

                <ToolButton
                    title="Lista numerada"
                    active={
                        editor.isActive(
                            "orderedList",
                        )
                    }
                    onClick={() =>
                        editor
                            .chain()
                            .focus()
                            .toggleOrderedList()
                            .run()
                    }
                >
                    <ListOrdered className="h-4 w-4" />
                </ToolButton>

                <ToolButton
                    title="Citação"
                    active={
                        editor.isActive(
                            "blockquote",
                        )
                    }
                    onClick={() =>
                        editor
                            .chain()
                            .focus()
                            .toggleBlockquote()
                            .run()
                    }
                >
                    <Quote className="h-4 w-4" />
                </ToolButton>

                <ToolButton
                    title="Linha horizontal"
                    onClick={() =>
                        editor
                            .chain()
                            .focus()
                            .setHorizontalRule()
                            .run()
                    }
                >
                    <Minus className="h-4 w-4" />
                </ToolButton>

                <Separator />

                <ToolButton
                    title="Alinhar à esquerda"
                    onClick={() =>
                        editor
                            .chain()
                            .focus()
                            .setTextAlign(
                                "left",
                            )
                            .run()
                    }
                >
                    <AlignLeft className="h-4 w-4" />
                </ToolButton>

                <ToolButton
                    title="Centralizar"
                    onClick={() =>
                        editor
                            .chain()
                            .focus()
                            .setTextAlign(
                                "center",
                            )
                            .run()
                    }
                >
                    <AlignCenter className="h-4 w-4" />
                </ToolButton>

                <ToolButton
                    title="Alinhar à direita"
                    onClick={() =>
                        editor
                            .chain()
                            .focus()
                            .setTextAlign(
                                "right",
                            )
                            .run()
                    }
                >
                    <AlignRight className="h-4 w-4" />
                </ToolButton>

                <Separator />

                <ToolButton
                    title="Link"
                    active={
                        editor.isActive(
                            "link",
                        )
                    }
                    onClick={() => {
                        const current =
                            editor.getAttributes(
                                "link",
                            )
                                .href as
                                | string
                                | undefined;

                        const url =
                            window.prompt(
                                "URL:",
                                current ??
                                    "https://",
                            );

                        if (
                            url === null
                        ) {
                            return;
                        }

                        if (
                            !url.trim()
                        ) {
                            editor
                                .chain()
                                .focus()
                                .unsetLink()
                                .run();

                            return;
                        }

                        editor
                            .chain()
                            .focus()
                            .extendMarkRange(
                                "link",
                            )
                            .setLink({
                                href:
                                    url,
                            })
                            .run();
                    }}
                >
                    <Link2 className="h-4 w-4" />
                </ToolButton>

                <ToolButton
                    title="Inserir imagem"
                    onClick={() =>
                        fileRef.current?.click()
                    }
                >
                    <ImagePlus className="h-4 w-4" />
                </ToolButton>

                <Separator />

                <ToolButton
                    title="Desfazer"
                    onClick={() =>
                        editor
                            .chain()
                            .focus()
                            .undo()
                            .run()
                    }
                >
                    <Undo2 className="h-4 w-4" />
                </ToolButton>

                <ToolButton
                    title="Refazer"
                    onClick={() =>
                        editor
                            .chain()
                            .focus()
                            .redo()
                            .run()
                    }
                >
                    <Redo2 className="h-4 w-4" />
                </ToolButton>

                <input
                    ref={fileRef}
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

                        await upload(
                            file,
                        );
                    }}
                />
            </div>

            <EditorContent
                editor={editor}
                className="
                    px-5 py-5
                    text-[16px] leading-8 text-slate-700
                    [&_.tiptap]:min-h-[420px]
                    [&_.tiptap_p]:my-3
                    [&_.tiptap_h2]:mb-4
                    [&_.tiptap_h2]:mt-8
                    [&_.tiptap_h2]:text-2xl
                    [&_.tiptap_h2]:font-bold
                    [&_.tiptap_h2]:text-slate-950
                    [&_.tiptap_h3]:mb-3
                    [&_.tiptap_h3]:mt-7
                    [&_.tiptap_h3]:text-xl
                    [&_.tiptap_h3]:font-bold
                    [&_.tiptap_h3]:text-slate-950
                    [&_.tiptap_ul]:my-4
                    [&_.tiptap_ul]:list-disc
                    [&_.tiptap_ul]:pl-6
                    [&_.tiptap_ol]:my-4
                    [&_.tiptap_ol]:list-decimal
                    [&_.tiptap_ol]:pl-6
                    [&_.tiptap_blockquote]:my-5
                    [&_.tiptap_blockquote]:border-l-4
                    [&_.tiptap_blockquote]:border-indigo-300
                    [&_.tiptap_blockquote]:pl-5
                    [&_.tiptap_blockquote]:italic
                    [&_.tiptap_a]:font-semibold
                    [&_.tiptap_a]:text-indigo-600
                    [&_.tiptap_img]:my-7
                    [&_.tiptap_img]:max-w-full
                    [&_.tiptap_img]:rounded-2xl
                "
            />
        </div>
    );
}

function Separator() {
    return (
        <span className="mx-1 h-8 w-px bg-slate-200" />
    );
}

function ToolButton({
    active=false,
    title,
    onClick,
    children,
}: {
    active?: boolean;
    title: string;
    onClick: () => void;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            title={title}
            onClick={onClick}
            className={[
                "flex h-8 w-8 items-center justify-center rounded-lg transition",
                active
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 hover:bg-white hover:text-indigo-600",
            ].join(
                " ",
            )}
        >
            {children}
        </button>
    );
}