import axios from "axios";

import {
    BadgeCheck,
    Check,
    Copy,
    Eye,
    FileCheck2,
    FileText,
    LoaderCircle,
    Search,
    ShieldCheck,
    Sparkles,
    X,
} from "lucide-react";

import { ReactNode, useMemo, useState } from "react";

import { useMutation, useQuery } from "@tanstack/react-query";

import {
    fetchModeloDocumentoRecomendado,
    fetchModelosDocumentoRecomendados,
    usarModeloDocumentoRecomendado,
} from "../../../lib/modelos-documento-saas";

import type { ModeloDocumentoRecomendado } from "../../../types/modelos-documento-saas";

import type { PerfilTemplate } from "../../../types/template";

export default function RecommendedTemplatesPanel({
    profiles,
    onUsed,
}: {
    profiles: PerfilTemplate[];

    onUsed: () => Promise<void>;
}) {
    const [search, setSearch] = useState("");

    const [categoryId, setCategoryId] = useState("");

    const [previewId, setPreviewId] = useState<string | null>(null);

    const [useModel, setUseModel] = useState<ModeloDocumentoRecomendado | null>(
        null,
    );

    const params = useMemo(() => {
        const result: Record<string, unknown> = {};

        if (search.trim()) {
            result.search = search.trim();
        }

        if (categoryId) {
            result.categoria_id = categoryId;
        }

        return result;
    }, [search, categoryId]);

    const catalogQuery = useQuery({
        queryKey: ["recommended-document-models", params],

        queryFn: () => fetchModelosDocumentoRecomendados(params),
    });

    const previewQuery = useQuery({
        queryKey: ["recommended-document-model", previewId],

        enabled: Boolean(previewId),

        queryFn: () => fetchModeloDocumentoRecomendado(previewId!),
    });

    const models = catalogQuery.data?.data ?? [];

    const categories = catalogQuery.data?.categories ?? [];

    return (
        <div>
            <section className="border-b border-indigo-100 bg-indigo-50/70 p-5">
                <div className="flex gap-3">
                    <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />

                    <div>
                        <h3 className="font-semibold text-indigo-950">
                            Modelos recomendados pelo FrotaPro
                        </h3>

                        <p className="mt-1 max-w-4xl text-sm leading-6 text-indigo-800">
                            Estes modelos foram preparados para integração
                            completa com os campos do FrotaPro. Pode utilizá-los
                            diretamente ou continuar a importar documentos
                            próprios da sua empresa. Documentos próprios serão
                            analisados automaticamente, mas dependendo da sua
                            estrutura poderão necessitar de revisão.
                        </p>
                    </div>
                </div>
            </section>

            <section className="border-b border-slate-200 p-5">
                <div className="grid gap-3 md:grid-cols-2">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Pesquisar modelos recomendados..."
                            className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                        />
                    </div>

                    <select
                        value={categoryId}
                        onChange={(event) => setCategoryId(event.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500"
                    >
                        <option value="">Todas as categorias</option>

                        {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.nome}
                            </option>
                        ))}
                    </select>
                </div>
            </section>

            {catalogQuery.isLoading ? (
                <Loading />
            ) : catalogQuery.isError ? (
                <div className="px-6 py-16 text-center">
                    <p className="text-sm text-red-600">
                        Não foi possível carregar os modelos recomendados.
                    </p>

                    <button
                        type="button"
                        onClick={() => catalogQuery.refetch()}
                        className="mt-4 h-10 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white"
                    >
                        Tentar novamente
                    </button>
                </div>
            ) : !models.length ? (
                <div className="px-6 py-20 text-center">
                    <FileCheck2 className="mx-auto h-12 w-12 text-slate-300" />

                    <h3 className="mt-4 font-semibold text-slate-900">
                        Nenhum modelo recomendado encontrado
                    </h3>

                    <p className="mt-2 text-sm text-slate-500">
                        Não existem modelos publicados para os filtros
                        selecionados.
                    </p>
                </div>
            ) : (
                <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
                    {models.map((model) => (
                        <ModelCard
                            key={model.id}
                            model={model}
                            onPreview={() => setPreviewId(model.id)}
                            onUse={() => setUseModel(model)}
                        />
                    ))}
                </div>
            )}

            {previewId && (
                <Modal
                    title="Pré-visualizar modelo recomendado"
                    onClose={() => setPreviewId(null)}
                    wide
                >
                    {previewQuery.isLoading ? (
                        <Loading />
                    ) : previewQuery.data ? (
                        <Preview
                            model={previewQuery.data}
                            onUse={() => {
                                setUseModel(previewQuery.data!);

                                setPreviewId(null);
                            }}
                        />
                    ) : (
                        <p className="text-sm text-red-600">
                            Não foi possível carregar o modelo.
                        </p>
                    )}
                </Modal>
            )}

            {useModel && (
                <UseModelModal
                    model={useModel}
                    profiles={profiles}
                    onClose={() => setUseModel(null)}
                    onSaved={async () => {
                        setUseModel(null);

                        await onUsed();
                    }}
                />
            )}
        </div>
    );
}

function ModelCard({
    model,
    onPreview,
    onUse,
}: {
    model: ModeloDocumentoRecomendado;

    onPreview: () => void;

    onUse: () => void;
}) {
    return (
        <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-indigo-200 hover:shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <FileText className="h-5 w-5" />
                </div>

                {model.destaque && (
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                        Recomendado
                    </span>
                )}
            </div>

            <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                    {model.categoria.nome}
                </p>

                <h3 className="mt-1 font-semibold text-slate-950">
                    {model.nome}
                </h3>

                <p className="mt-2 min-h-10 text-sm leading-5 text-slate-500">
                    {model.resumo ??
                        "Modelo preparado para utilização no FrotaPro."}
                </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
                <Badge>
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Validado tecnicamente
                </Badge>

                {model.juridicamente_revisto && (
                    <Badge tone="blue">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Revisto juridicamente
                    </Badge>
                )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-xs">
                <div>
                    <div className="text-slate-400">Versão</div>

                    <div className="mt-1 font-semibold text-slate-700">
                        v{model.versao}
                    </div>
                </div>

                <div>
                    <div className="text-slate-400">País</div>

                    <div className="mt-1 font-semibold text-slate-700">
                        {model.pais}
                    </div>
                </div>
            </div>

            {!!model.entidades_requeridas?.length && (
                <div className="mt-4">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Utiliza dados de
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {model.entidades_requeridas.map((entity) => (
                            <span
                                key={entity}
                                className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600"
                            >
                                {entityLabel(entity)}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <div className="mt-auto flex gap-2 pt-5">
                <button
                    type="button"
                    onClick={onPreview}
                    className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                    <Eye className="h-4 w-4" />
                    Pré-visualizar
                </button>

                <button
                    type="button"
                    onClick={onUse}
                    className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                    <Copy className="h-4 w-4" />
                    Usar modelo
                </button>
            </div>
        </article>
    );
}

function Preview({
    model,
    onUse,
}: {
    model: ModeloDocumentoRecomendado;

    onUse: () => void;
}) {
    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-sm font-semibold text-indigo-600">
                        {model.categoria.nome}
                    </p>

                    <h3 className="mt-1 text-xl font-bold text-slate-950">
                        {model.nome}
                    </h3>

                    {model.descricao && (
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                            {model.descricao}
                        </p>
                    )}
                </div>

                <button
                    type="button"
                    onClick={onUse}
                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white"
                >
                    <Copy className="h-4 w-4" />
                    Usar este modelo
                </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
                <Info label="Versão" value={`v${model.versao}`} />

                <Info label="Idioma" value={model.idioma} />

                <Info
                    label="Validação"
                    value={
                        model.juridicamente_revisto
                            ? "Técnica + jurídica"
                            : "Técnica"
                    }
                />
            </div>

            <section className="rounded-2xl border border-slate-200">
                <div className="border-b border-slate-200 px-4 py-3">
                    <h4 className="font-semibold text-slate-900">
                        Estrutura do documento
                    </h4>

                    <p className="mt-1 text-xs text-slate-500">
                        Os marcadores serão preenchidos automaticamente pelo
                        FrotaPro quando o documento for utilizado.
                    </p>
                </div>

                <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap break-words bg-slate-50 p-5 font-mono text-xs leading-6 text-slate-700">
                    {model.conteudo_parametrizado}
                </pre>
            </section>

            {!!model.assinaturas_requeridas?.length && (
                <section>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Assinaturas previstas
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                        {model.assinaturas_requeridas.map((signature) => (
                            <span
                                key={signature}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700"
                            >
                                <Check className="h-3.5 w-3.5" />

                                {signatureLabel(signature)}
                            </span>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

function UseModelModal({
    model,
    profiles,
    onClose,
    onSaved,
}: {
    model: ModeloDocumentoRecomendado;

    profiles: PerfilTemplate[];

    onClose: () => void;

    onSaved: () => Promise<void>;
}) {
    const [name, setName] = useState(model.nome);

    const [profileId, setProfileId] = useState("");

    const mutation = useMutation({
        mutationFn: () =>
            usarModeloDocumentoRecomendado(model.id, {
                nome: name.trim(),

                perfil_id: profileId || null,
            }),

        onSuccess: onSaved,
    });

    return (
        <Modal title="Usar modelo recomendado" onClose={onClose}>
            <div className="space-y-5">
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                    <div className="flex gap-3">
                        <FileCheck2 className="h-5 w-5 shrink-0 text-indigo-600" />

                        <div>
                            <h3 className="font-semibold text-indigo-950">
                                {model.nome}
                            </h3>

                            <p className="mt-1 text-sm leading-6 text-indigo-800">
                                Será criada uma cópia privada da versão{" "}
                                <strong>{model.versao}</strong> para a sua
                                organização. Alterações futuras no catálogo
                                FrotaPro não modificarão a sua cópia.
                            </p>
                        </div>
                    </div>
                </div>

                {mutation.isError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {errorMessage(
                            mutation.error,
                            "Não foi possível copiar o modelo.",
                        )}
                    </div>
                )}

                <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                        Nome na sua empresa
                    </span>

                    <input
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        className={inputClass}
                    />
                </label>

                <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                        Perfil
                    </span>

                    <select
                        value={profileId}
                        onChange={(event) => setProfileId(event.target.value)}
                        className={inputClass}
                    >
                        <option value="">Sem perfil</option>

                        {profiles.map((profile) => (
                            <option key={profile.id} value={profile.id}>
                                {profile.nome}
                            </option>
                        ))}
                    </select>
                </label>

                <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600"
                    >
                        Cancelar
                    </button>

                    <button
                        type="button"
                        disabled={mutation.isPending || !name.trim()}
                        onClick={() => mutation.mutate()}
                        className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
                    >
                        {mutation.isPending ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                            <Copy className="h-4 w-4" />
                        )}
                        Criar cópia
                    </button>
                </div>
            </div>
        </Modal>
    );
}

function Modal({
    title,
    children,
    onClose,
    wide = false,
}: {
    title: string;

    children: ReactNode;

    onClose: () => void;

    wide?: boolean;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
                type="button"
                aria-label="Fechar"
                onClick={onClose}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />

            <div
                className={[
                    "relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl",

                    wide ? "max-w-5xl" : "max-w-lg",
                ].join(" ")}
            >
                <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
                    <h2 className="font-semibold text-slate-950">{title}</h2>

                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-slate-100"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </header>

                <div className="p-6">{children}</div>
            </div>
        </div>
    );
}

function Badge({
    children,
    tone = "green",
}: {
    children: ReactNode;

    tone?: "green" | "blue";
}) {
    return (
        <span
            className={[
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",

                tone === "blue"
                    ? "bg-indigo-50 text-indigo-700"
                    : "bg-emerald-50 text-emerald-700",
            ].join(" ")}
        >
            {children}
        </span>
    );
}

function Info({
    label,
    value,
}: {
    label: string;

    value: string;
}) {
    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {label}
            </div>

            <div className="mt-1 text-sm font-semibold text-slate-800">
                {value}
            </div>
        </div>
    );
}

function Loading() {
    return (
        <div className="flex justify-center py-20">
            <LoaderCircle className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
    );
}

function entityLabel(value: string): string {
    const labels: Record<string, string> = {
        empresa: "Empresa",

        motorista: "Motorista",

        proprietario: "Proprietário",

        veiculo: "Veículo",

        contrato: "Contrato",
    };

    return labels[value] ?? value;
}

function signatureLabel(value: string): string {
    const labels: Record<string, string> = {
        ASSINATURA_EMPRESA: "Empresa",

        ASSINATURA_MOTORISTA: "Motorista",

        ASSINATURA_PROPRIETARIO: "Proprietário",

        ASSINATURA_TESTEMUNHA: "Testemunha",
    };

    return labels[value] ?? value;
}

function errorMessage(error: unknown, fallback: string): string {
    if (axios.isAxiosError(error)) {
        const errors = error.response?.data?.errors;

        if (errors && typeof errors === "object") {
            const first = Object.values(errors)
                .flat()
                .find((value) => typeof value === "string");

            if (typeof first === "string") {
                return first;
            }
        }

        return error.response?.data?.message ?? fallback;
    }

    return fallback;
}

const inputClass =
    "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";
