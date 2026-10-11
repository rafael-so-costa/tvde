import axios from "axios";
import {
    Archive,
    BadgeCheck,
    Edit3,
    FileText,
    History,
    LoaderCircle,
    Plus,
    Search,
    ShieldCheck,
    Trash2,
    X,
} from "lucide-react";
import { FormEvent, ReactNode, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    archiveBackofficeModeloDocumento,
    deleteBackofficeModeloDocumentoCategoria,
    fetchBackofficeModeloDocumento,
    fetchBackofficeModeloDocumentoCategorias,
    fetchBackofficeModelosDocumento,
    publishBackofficeModeloDocumento,
    saveBackofficeModeloDocumento,
    saveBackofficeModeloDocumentoCategoria,
} from "../lib/modelos-documento-saas";

import type {
    ModeloDocumentoSaas,
    ModeloDocumentoSaasCategoria,
    ModeloDocumentoSaasCategoriaPayload,
    ModeloDocumentoSaasPayload,
} from "../types/modelos-documento-saas";

type Tab = "modelos" | "categorias";

export default function BackofficeModelosDocumentoPage() {
    const client = useQueryClient();

    const [tab, setTab] = useState<Tab>("modelos");
    const [search, setSearch] = useState("");
    const [categoriaId, setCategoriaId] = useState("");
    const [status, setStatus] = useState("");

    const [modelOpen, setModelOpen] = useState(false);
    const [editingModelId, setEditingModelId] = useState<string | null>(null);

    const [categoryOpen, setCategoryOpen] = useState(false);
    const [editingCategory, setEditingCategory] =
        useState<ModeloDocumentoSaasCategoria | null>(null);

    const [versionsModelId, setVersionsModelId] = useState<string | null>(null);

    const params = useMemo(() => {
        const result: Record<string, unknown> = {};

        if (search.trim()) {
            result.search = search.trim();
        }

        if (categoriaId) {
            result.categoria_id = categoriaId;
        }

        if (status) {
            result.status = status;
        }

        return result;
    }, [search, categoriaId, status]);

    const modelsQuery = useQuery({
        queryKey: ["backoffice-modelos-documento", "list", params],
        queryFn: () => fetchBackofficeModelosDocumento(params),
    });

    const categoriesQuery = useQuery({
        queryKey: ["backoffice-modelos-documento", "categories"],
        queryFn: fetchBackofficeModeloDocumentoCategorias,
    });

    const editQuery = useQuery({
        queryKey: ["backoffice-modelos-documento", "model", editingModelId],
        enabled: modelOpen && Boolean(editingModelId),
        queryFn: () => fetchBackofficeModeloDocumento(editingModelId!),
    });

    const versionsQuery = useQuery({
        queryKey: [
            "backoffice-modelos-documento",
            "versions-model",
            versionsModelId,
        ],
        enabled: Boolean(versionsModelId),
        queryFn: () => fetchBackofficeModeloDocumento(versionsModelId!),
    });

    function refresh() {
        client.invalidateQueries({
            queryKey: ["backoffice-modelos-documento"],
        });
    }

    const publishMutation = useMutation({
        mutationFn: publishBackofficeModeloDocumento,
        onSuccess: refresh,
    });

    const archiveMutation = useMutation({
        mutationFn: archiveBackofficeModeloDocumento,
        onSuccess: refresh,
    });

    const deleteCategoryMutation = useMutation({
        mutationFn: deleteBackofficeModeloDocumentoCategoria,
        onSuccess: refresh,
    });

    const list = modelsQuery.data?.data ?? [];
    const categories = categoriesQuery.data ?? [];

    const total = list.length;

    const published = list.filter(
        (model) => model.status === "publicado",
    ).length;

    const drafts = list.filter((model) => model.status === "rascunho").length;

    const copies = list.reduce(
        (sum, model) => sum + (model.templates_tenant_count ?? 0),
        0,
    );

    function openNewModel() {
        if (!categories.length) {
            setTab("categorias");
            setEditingCategory(null);
            setCategoryOpen(true);

            return;
        }

        setEditingModelId(null);
        setModelOpen(true);
    }

    function openEditModel(id: string) {
        setEditingModelId(id);
        setModelOpen(true);
    }

    async function publishModel(model: ModeloDocumentoSaas) {
        if (!model.tecnicamente_validado) {
            window.alert("Este modelo ainda não passou na validação técnica.");

            return;
        }

        if (
            !window.confirm(
                `Publicar a versão ${model.versao} de "${model.nome}"? A versão publicada será imutável.`,
            )
        ) {
            return;
        }

        try {
            await publishMutation.mutateAsync(model.id);
        } catch (error) {
            window.alert(
                errorMessage(error, "Não foi possível publicar o modelo."),
            );
        }
    }

    async function archiveModel(model: ModeloDocumentoSaas) {
        if (
            !window.confirm(
                `Arquivar "${model.nome}"? O modelo deixará de aparecer no catálogo dos gestores.`,
            )
        ) {
            return;
        }

        try {
            await archiveMutation.mutateAsync(model.id);
        } catch (error) {
            window.alert(
                errorMessage(error, "Não foi possível arquivar o modelo."),
            );
        }
    }

    return (
        <div className="mx-auto max-w-7xl space-y-7">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="mb-2 text-sm font-medium text-indigo-600">
                        Padronização documental
                    </p>

                    <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                        Modelos recomendados
                    </h1>

                    <p className="mt-2 max-w-3xl text-slate-500">
                        Administre os modelos de documentos oficiais
                        disponibilizados pelo FrotaPro às organizações.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => {
                        if (tab === "modelos") {
                            openNewModel();

                            return;
                        }

                        setEditingCategory(null);
                        setCategoryOpen(true);
                    }}
                    className={primaryButton}
                >
                    <Plus className="h-4 w-4" />

                    {tab === "modelos" ? "Novo modelo" : "Nova categoria"}
                </button>
            </header>

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Kpi label="Modelos" value={total} />
                <Kpi label="Publicados" value={published} />
                <Kpi label="Rascunhos" value={drafts} />
                <Kpi label="Cópias nos tenants" value={copies} />
            </section>

            <div className="flex gap-2 border-b border-slate-200">
                <TabButton
                    active={tab === "modelos"}
                    onClick={() => setTab("modelos")}
                >
                    Modelos
                </TabButton>

                <TabButton
                    active={tab === "categorias"}
                    onClick={() => setTab("categorias")}
                >
                    Categorias
                </TabButton>
            </div>

            {tab === "modelos" ? (
                <>
                    <section className="rounded-2xl border border-slate-200 bg-white p-5">
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                                <input
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    placeholder="Pesquisar modelos..."
                                    className={`${inputClass} pl-9`}
                                />
                            </div>

                            <select
                                value={categoriaId}
                                onChange={(event) =>
                                    setCategoriaId(event.target.value)
                                }
                                className={inputClass}
                            >
                                <option value="">Todas as categorias</option>

                                {categories.map((category) => (
                                    <option
                                        key={category.id}
                                        value={category.id}
                                    >
                                        {category.nome}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={status}
                                onChange={(event) =>
                                    setStatus(event.target.value)
                                }
                                className={inputClass}
                            >
                                <option value="">Todos os estados</option>

                                <option value="rascunho">Rascunho</option>

                                <option value="publicado">Publicado</option>

                                <option value="arquivado">Arquivado</option>
                            </select>
                        </div>
                    </section>

                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                        {modelsQuery.isLoading ? (
                            <Loading />
                        ) : !list.length ? (
                            <Empty text="Nenhum modelo recomendado encontrado." />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr>
                                            <Th>Modelo</Th>
                                            <Th>Categoria</Th>
                                            <Th>Versão</Th>
                                            <Th>Validação</Th>
                                            <Th>Estado</Th>
                                            <Th>Uso</Th>
                                            <Th>Ações</Th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {list.map((model) => (
                                            <tr
                                                key={model.id}
                                                className="border-t border-slate-100"
                                            >
                                                <Td>
                                                    <div className="flex items-start gap-3">
                                                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                                            <FileText className="h-4 w-4" />
                                                        </div>

                                                        <div>
                                                            <div className="font-semibold text-slate-900">
                                                                {model.nome}
                                                            </div>

                                                            <div className="mt-1 max-w-sm text-xs text-slate-500">
                                                                {model.resumo ??
                                                                    "Sem descrição curta."}
                                                            </div>

                                                            {model.destaque && (
                                                                <span className="mt-2 inline-flex rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">
                                                                    Destaque
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </Td>

                                                <Td>
                                                    {model.categoria?.nome ??
                                                        "—"}
                                                </Td>

                                                <Td>
                                                    <div className="font-medium text-slate-800">
                                                        Preparação:{" "}
                                                        {model.versao}
                                                    </div>

                                                    <div className="mt-1 text-xs text-slate-400">
                                                        Publicada:{" "}
                                                        {model.versao_publicada ??
                                                            "—"}
                                                    </div>
                                                </Td>

                                                <Td>
                                                    {model.tecnicamente_validado ? (
                                                        <Badge
                                                            tone="green"
                                                            icon={
                                                                <BadgeCheck className="h-3.5 w-3.5" />
                                                            }
                                                        >
                                                            Técnica OK
                                                        </Badge>
                                                    ) : (
                                                        <Badge tone="amber">
                                                            Revisão necessária
                                                        </Badge>
                                                    )}

                                                    {model.juridicamente_revisto && (
                                                        <div className="mt-2">
                                                            <Badge
                                                                tone="blue"
                                                                icon={
                                                                    <ShieldCheck className="h-3.5 w-3.5" />
                                                                }
                                                            >
                                                                Revisão jurídica
                                                            </Badge>
                                                        </div>
                                                    )}
                                                </Td>

                                                <Td>
                                                    <StatusBadge
                                                        status={model.status}
                                                    />
                                                </Td>

                                                <Td>
                                                    <div className="font-semibold text-slate-900">
                                                        {model.templates_tenant_count ??
                                                            0}
                                                    </div>

                                                    <div className="text-xs text-slate-400">
                                                        cópias
                                                    </div>
                                                </Td>

                                                <Td>
                                                    <div className="flex flex-wrap gap-2">
                                                        <IconButton
                                                            title="Editar"
                                                            onClick={() =>
                                                                openEditModel(
                                                                    model.id,
                                                                )
                                                            }
                                                        >
                                                            <Edit3 className="h-4 w-4" />
                                                        </IconButton>

                                                        <IconButton
                                                            title="Versões"
                                                            onClick={() =>
                                                                setVersionsModelId(
                                                                    model.id,
                                                                )
                                                            }
                                                        >
                                                            <History className="h-4 w-4" />
                                                        </IconButton>

                                                        {model.status !==
                                                            "arquivado" && (
                                                            <IconButton
                                                                title="Publicar"
                                                                onClick={() =>
                                                                    publishModel(
                                                                        model,
                                                                    )
                                                                }
                                                                disabled={
                                                                    publishMutation.isPending
                                                                }
                                                            >
                                                                <BadgeCheck className="h-4 w-4" />
                                                            </IconButton>
                                                        )}

                                                        {model.status !==
                                                            "arquivado" && (
                                                            <IconButton
                                                                title="Arquivar"
                                                                onClick={() =>
                                                                    archiveModel(
                                                                        model,
                                                                    )
                                                                }
                                                                disabled={
                                                                    archiveMutation.isPending
                                                                }
                                                            >
                                                                <Archive className="h-4 w-4" />
                                                            </IconButton>
                                                        )}
                                                    </div>
                                                </Td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </>
            ) : (
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    {categoriesQuery.isLoading ? (
                        <Loading />
                    ) : !categories.length ? (
                        <Empty text="Nenhuma categoria cadastrada." />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr>
                                        <Th>Categoria</Th>
                                        <Th>Descrição</Th>
                                        <Th>Ordem</Th>
                                        <Th>Modelos</Th>
                                        <Th>Estado</Th>
                                        <Th>Ações</Th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {categories.map((category) => (
                                        <tr
                                            key={category.id}
                                            className="border-t border-slate-100"
                                        >
                                            <Td>
                                                <div className="font-semibold text-slate-900">
                                                    {category.nome}
                                                </div>

                                                <div className="mt-1 text-xs text-slate-400">
                                                    {category.slug}
                                                </div>
                                            </Td>

                                            <Td>{category.descricao ?? "—"}</Td>

                                            <Td>{category.ordem}</Td>

                                            <Td>
                                                {category.modelos_count ?? 0}
                                            </Td>

                                            <Td>
                                                {category.ativo
                                                    ? "Ativa"
                                                    : "Inativa"}
                                            </Td>

                                            <Td>
                                                <div className="flex gap-2">
                                                    <IconButton
                                                        title="Editar"
                                                        onClick={() => {
                                                            setEditingCategory(
                                                                category,
                                                            );

                                                            setCategoryOpen(
                                                                true,
                                                            );
                                                        }}
                                                    >
                                                        <Edit3 className="h-4 w-4" />
                                                    </IconButton>

                                                    <IconButton
                                                        title="Eliminar"
                                                        tone="danger"
                                                        disabled={
                                                            deleteCategoryMutation.isPending
                                                        }
                                                        onClick={() => {
                                                            if (
                                                                !window.confirm(
                                                                    `Eliminar a categoria "${category.nome}"?`,
                                                                )
                                                            ) {
                                                                return;
                                                            }

                                                            deleteCategoryMutation
                                                                .mutateAsync(
                                                                    category.id,
                                                                )
                                                                .catch(
                                                                    (error) =>
                                                                        window.alert(
                                                                            errorMessage(
                                                                                error,
                                                                                "Não foi possível eliminar a categoria.",
                                                                            ),
                                                                        ),
                                                                );
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </IconButton>
                                                </div>
                                            </Td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            )}

            {modelOpen && (!editingModelId || editQuery.data) && (
                <ModelModal
                    model={editingModelId ? (editQuery.data ?? null) : null}
                    categories={categories}
                    onClose={() => {
                        setModelOpen(false);
                        setEditingModelId(null);
                    }}
                    onSaved={() => {
                        setModelOpen(false);
                        setEditingModelId(null);
                        refresh();
                    }}
                />
            )}

            {modelOpen && editingModelId && editQuery.isLoading && (
                <Modal
                    title="Carregando modelo"
                    onClose={() => {
                        setModelOpen(false);
                        setEditingModelId(null);
                    }}
                >
                    <Loading />
                </Modal>
            )}

            {categoryOpen && (
                <CategoryModal
                    category={editingCategory}
                    onClose={() => {
                        setCategoryOpen(false);
                        setEditingCategory(null);
                    }}
                    onSaved={() => {
                        setCategoryOpen(false);
                        setEditingCategory(null);
                        refresh();
                    }}
                />
            )}

            {versionsModelId && (
                <Modal
                    title="Histórico de versões"
                    onClose={() => setVersionsModelId(null)}
                    wide
                >
                    {versionsQuery.isLoading ? (
                        <Loading />
                    ) : (
                        <VersionsPanel model={versionsQuery.data ?? null} />
                    )}
                </Modal>
            )}
        </div>
    );
}

function ModelModal({
    model,
    categories,
    onClose,
    onSaved,
}: {
    model: ModeloDocumentoSaas | null;
    categories: ModeloDocumentoSaasCategoria[];
    onClose: () => void;
    onSaved: () => void;
}) {
    const [form, setForm] = useState<ModeloDocumentoSaasPayload>({
        categoria_id: model?.categoria_id ?? categories[0]?.id ?? "",

        nome: model?.nome ?? "",

        slug: model?.slug ?? null,

        resumo: model?.resumo ?? null,

        descricao: model?.descricao ?? null,

        tipo_documento: model?.tipo_documento ?? null,

        pais: model?.pais ?? "PT",

        idioma: model?.idioma ?? "pt-PT",

        conteudo: model?.conteudo ?? "",

        versao: model?.versao ?? "1.0",

        juridicamente_revisto: model?.juridicamente_revisto ?? false,

        destaque: model?.destaque ?? false,

        ativo: model?.ativo ?? true,

        ordem: model?.ordem ?? 0,
    });

    const mutation = useMutation({
        mutationFn: (payload: ModeloDocumentoSaasPayload) =>
            saveBackofficeModeloDocumento(model?.id ?? null, payload),

        onSuccess: onSaved,
    });

    function patch<K extends keyof ModeloDocumentoSaasPayload>(
        key: K,
        value: ModeloDocumentoSaasPayload[K],
    ) {
        setForm((current) => ({
            ...current,
            [key]: value,
        }));
    }

    function submit(event: FormEvent) {
        event.preventDefault();

        const payload: ModeloDocumentoSaasPayload = {
            ...form,

            categoria_id: form.categoria_id.trim(),

            nome: form.nome.trim(),

            conteudo: form.conteudo.trim(),

            slug: form.slug?.trim() || null,

            resumo: form.resumo?.trim() || null,

            descricao: form.descricao?.trim() || null,

            tipo_documento: form.tipo_documento?.trim() || null,

            pais: form.pais?.trim().toUpperCase() || "PT",

            idioma: form.idioma?.trim() || "pt-PT",

            versao: form.versao?.trim() || "1.0",
        };

        if (!payload.categoria_id || !payload.nome || !payload.conteudo) {
            return;
        }

        mutation.mutate(payload);
    }

    const categoriaError = fieldError(mutation.error, "categoria_id");

    const nomeError = fieldError(mutation.error, "nome");

    const conteudoError = fieldError(mutation.error, "conteudo");

    const versaoError = fieldError(mutation.error, "versao");

    return (
        <Modal
            title={
                model ? "Editar modelo recomendado" : "Novo modelo recomendado"
            }
            onClose={onClose}
            wide
        >
            <form onSubmit={submit} className="space-y-6">
                {mutation.isError && (
                    <ErrorBox message="Não foi possível guardar o modelo. Verifique os campos assinalados abaixo." />
                )}

                {model && (
                    <section className="grid gap-3 sm:grid-cols-3">
                        <InfoCard label="Estado" value={model.status} />

                        <InfoCard
                            label="Validação técnica"
                            value={
                                model.tecnicamente_validado
                                    ? "Aprovada"
                                    : "Requer revisão"
                            }
                        />

                        <InfoCard
                            label="Versão publicada"
                            value={model.versao_publicada ?? "Nenhuma"}
                        />
                    </section>
                )}

                <section className="grid gap-4 md:grid-cols-2">
                    <Field label="Categoria">
                        <select
                            name="categoria_id"
                            required
                            value={form.categoria_id}
                            onChange={(event) =>
                                patch("categoria_id", event.target.value)
                            }
                            disabled={!categories.length}
                            className={`${inputClass} disabled:bg-slate-100 disabled:text-slate-400 ${
                                categoriaError ? errorInputClass : ""
                            }`}
                        >
                            {!categories.length && (
                                <option value="">
                                    Nenhuma categoria disponível
                                </option>
                            )}

                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.nome}
                                </option>
                            ))}
                        </select>

                        {categoriaError && (
                            <FieldError>{categoriaError}</FieldError>
                        )}
                    </Field>

                    <Field label="Nome">
                        <input
                            name="nome"
                            required
                            value={form.nome}
                            onChange={(event) =>
                                patch("nome", event.target.value)
                            }
                            className={`${inputClass} ${
                                nomeError ? errorInputClass : ""
                            }`}
                        />

                        {nomeError && <FieldError>{nomeError}</FieldError>}
                    </Field>

                    <Field label="Slug">
                        <input
                            name="slug"
                            value={form.slug ?? ""}
                            onChange={(event) =>
                                patch("slug", event.target.value || null)
                            }
                            placeholder="Gerado automaticamente se vazio"
                            className={inputClass}
                        />
                    </Field>

                    <Field label="Tipo de documento">
                        <input
                            name="tipo_documento"
                            value={form.tipo_documento ?? ""}
                            onChange={(event) =>
                                patch(
                                    "tipo_documento",
                                    event.target.value || null,
                                )
                            }
                            placeholder="contrato_prestacao_servicos"
                            className={inputClass}
                        />
                    </Field>

                    <Field label="País">
                        <input
                            name="pais"
                            maxLength={2}
                            value={form.pais ?? "PT"}
                            onChange={(event) =>
                                patch("pais", event.target.value.toUpperCase())
                            }
                            className={inputClass}
                        />
                    </Field>

                    <Field label="Idioma">
                        <input
                            name="idioma"
                            value={form.idioma ?? "pt-PT"}
                            onChange={(event) =>
                                patch("idioma", event.target.value)
                            }
                            className={inputClass}
                        />
                    </Field>

                    <Field label="Versão em preparação">
                        <input
                            name="versao"
                            required
                            value={form.versao ?? "1.0"}
                            onChange={(event) =>
                                patch("versao", event.target.value)
                            }
                            placeholder="1.0"
                            className={`${inputClass} ${
                                versaoError ? errorInputClass : ""
                            }`}
                        />

                        {versaoError && <FieldError>{versaoError}</FieldError>}
                    </Field>

                    <Field label="Ordem">
                        <input
                            name="ordem"
                            type="number"
                            min={0}
                            value={form.ordem ?? 0}
                            onChange={(event) =>
                                patch("ordem", Number(event.target.value))
                            }
                            className={inputClass}
                        />
                    </Field>
                </section>

                <Field label="Descrição curta">
                    <textarea
                        name="resumo"
                        rows={2}
                        value={form.resumo ?? ""}
                        onChange={(event) =>
                            patch("resumo", event.target.value || null)
                        }
                        className={textareaClass}
                    />
                </Field>

                <Field label="Descrição">
                    <textarea
                        name="descricao"
                        rows={4}
                        value={form.descricao ?? ""}
                        onChange={(event) =>
                            patch("descricao", event.target.value || null)
                        }
                        className={textareaClass}
                    />
                </Field>

                <Field label="Documento">
                    <textarea
                        name="conteudo"
                        required
                        rows={20}
                        value={form.conteudo}
                        onChange={(event) =>
                            patch("conteudo", event.target.value)
                        }
                        placeholder="Cole aqui o conteúdo completo do documento..."
                        className={`${textareaClass} font-mono text-[13px] leading-6 ${
                            conteudoError ? errorInputClass : ""
                        }`}
                    />

                    {conteudoError && <FieldError>{conteudoError}</FieldError>}

                    <p className="mt-2 text-xs text-slate-400">
                        O conteúdo será analisado automaticamente ao guardar.
                        Modelos com avisos técnicos bloqueantes não poderão ser
                        publicados.
                    </p>
                </Field>

                <section className="grid gap-3 md:grid-cols-3">
                    <CheckField
                        checked={form.juridicamente_revisto ?? false}
                        onChange={(value) =>
                            patch("juridicamente_revisto", value)
                        }
                        label="Revisto juridicamente"
                    />

                    <CheckField
                        checked={form.destaque ?? false}
                        onChange={(value) => patch("destaque", value)}
                        label="Modelo em destaque"
                    />

                    <CheckField
                        checked={form.ativo ?? true}
                        onChange={(value) => patch("ativo", value)}
                        label="Modelo ativo"
                    />
                </section>

                {model && model.warnings?.length > 0 && (
                    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <h3 className="font-semibold text-amber-900">
                            Avisos da análise
                        </h3>

                        <div className="mt-3 space-y-2">
                            {model.warnings.map((warning, index) => (
                                <div
                                    key={`${warning.code}-${index}`}
                                    className="rounded-xl bg-white/70 px-3 py-2 text-sm text-amber-900"
                                >
                                    <span className="font-semibold">
                                        {warning.code}
                                    </span>

                                    {" — "}

                                    {warning.message}
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {model?.tecnicamente_validado && (
                    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                        <div className="flex items-center gap-2 font-semibold">
                            <BadgeCheck className="h-5 w-5" />
                            Modelo tecnicamente validado
                        </div>

                        <p className="mt-2">
                            Não foram encontrados avisos técnicos bloqueantes na
                            última análise.
                        </p>
                    </section>
                )}

                <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                    <button
                        type="button"
                        onClick={onClose}
                        className={secondaryButton}
                    >
                        Cancelar
                    </button>

                    <button
                        type="submit"
                        disabled={
                            mutation.isPending ||
                            !form.categoria_id ||
                            !form.nome.trim() ||
                            !form.conteudo.trim()
                        }
                        className={primaryButton}
                    >
                        {mutation.isPending && (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                        )}
                        Guardar modelo
                    </button>
                </div>
            </form>
        </Modal>
    );
}

function CategoryModal({
    category,
    onClose,
    onSaved,
}: {
    category: ModeloDocumentoSaasCategoria | null;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [form, setForm] = useState<ModeloDocumentoSaasCategoriaPayload>({
        nome: category?.nome ?? "",

        slug: category?.slug ?? null,

        descricao: category?.descricao ?? null,

        ordem: category?.ordem ?? 0,

        ativo: category?.ativo ?? true,
    });

    const mutation = useMutation({
        mutationFn: () => {
            const payload: ModeloDocumentoSaasCategoriaPayload = {
                nome: form.nome.trim(),

                descricao: form.descricao?.trim() || null,

                ordem: form.ordem ?? 0,

                ativo: form.ativo ?? true,
            };

            if (form.slug && form.slug.trim()) {
                payload.slug = form.slug.trim();
            }

            return saveBackofficeModeloDocumentoCategoria(
                category?.id ?? null,
                payload,
            );
        },

        onSuccess: onSaved,
    });

    const nomeError = fieldError(mutation.error, "nome");

    const slugError = fieldError(mutation.error, "slug");

    return (
        <Modal
            title={category ? "Editar categoria" : "Nova categoria"}
            onClose={onClose}
        >
            <form
                onSubmit={(event) => {
                    event.preventDefault();

                    if (!form.nome.trim()) {
                        return;
                    }

                    mutation.mutate();
                }}
                className="space-y-4"
            >
                {mutation.isError && (
                    <ErrorBox message="Não foi possível guardar a categoria. Verifique os campos assinalados." />
                )}

                <Field label="Nome">
                    <input
                        name="nome"
                        required
                        value={form.nome}
                        onChange={(event) =>
                            setForm((current) => ({
                                ...current,

                                nome: event.target.value,
                            }))
                        }
                        className={`${inputClass} ${
                            nomeError ? errorInputClass : ""
                        }`}
                    />

                    {nomeError && <FieldError>{nomeError}</FieldError>}
                </Field>

                <Field label="Slug">
                    <input
                        name="slug"
                        value={form.slug ?? ""}
                        onChange={(event) =>
                            setForm((current) => ({
                                ...current,

                                slug: event.target.value || null,
                            }))
                        }
                        placeholder="Gerado automaticamente se vazio"
                        className={`${inputClass} ${
                            slugError ? errorInputClass : ""
                        }`}
                    />

                    {slugError && <FieldError>{slugError}</FieldError>}
                </Field>

                <Field label="Descrição">
                    <textarea
                        name="descricao"
                        rows={4}
                        value={form.descricao ?? ""}
                        onChange={(event) =>
                            setForm((current) => ({
                                ...current,

                                descricao: event.target.value || null,
                            }))
                        }
                        className={textareaClass}
                    />
                </Field>

                <Field label="Ordem">
                    <input
                        name="ordem"
                        type="number"
                        min={0}
                        value={form.ordem ?? 0}
                        onChange={(event) =>
                            setForm((current) => ({
                                ...current,

                                ordem: Number(event.target.value),
                            }))
                        }
                        className={inputClass}
                    />
                </Field>

                <CheckField
                    checked={form.ativo ?? true}
                    onChange={(value) =>
                        setForm((current) => ({
                            ...current,

                            ativo: value,
                        }))
                    }
                    label="Categoria ativa"
                />

                <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                    <button
                        type="button"
                        onClick={onClose}
                        className={secondaryButton}
                    >
                        Cancelar
                    </button>

                    <button
                        type="submit"
                        disabled={mutation.isPending || !form.nome.trim()}
                        className={primaryButton}
                    >
                        {mutation.isPending && (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                        )}
                        Guardar
                    </button>
                </div>
            </form>
        </Modal>
    );
}

function VersionsPanel({ model }: { model: ModeloDocumentoSaas | null }) {
    if (!model) {
        return <Empty text="Modelo não encontrado." />;
    }

    const versions = model.versoes ?? [];

    return (
        <div className="space-y-5">
            <div>
                <h3 className="text-lg font-bold text-slate-950">
                    {model.nome}
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                    Cada versão publicada é imutável e pode continuar associada
                    aos modelos copiados pelas organizações.
                </p>
            </div>

            {!versions.length ? (
                <Empty text="Ainda não existem versões publicadas." />
            ) : (
                <div className="space-y-3">
                    {versions.map((version) => (
                        <div
                            key={version.id}
                            className="rounded-2xl border border-slate-200 p-4"
                        >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg font-bold text-slate-950">
                                            v{version.versao}
                                        </span>

                                        {version.juridicamente_revisto && (
                                            <Badge tone="blue">
                                                Revisão jurídica
                                            </Badge>
                                        )}
                                    </div>

                                    <p className="mt-2 text-sm text-slate-500">
                                        Publicado em{" "}
                                        {formatDate(version.publicado_em)}
                                    </p>
                                </div>

                                <Badge tone="green">Snapshot imutável</Badge>
                            </div>

                            <div className="mt-4 rounded-xl bg-slate-50 p-3">
                                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                    SHA-256
                                </div>

                                <div className="mt-1 break-all font-mono text-xs text-slate-600">
                                    {version.checksum}
                                </div>
                            </div>

                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                <InfoCard
                                    label="Entidades"
                                    value={
                                        version.entidades_requeridas?.join(
                                            ", ",
                                        ) || "Nenhuma"
                                    }
                                />

                                <InfoCard
                                    label="Assinaturas"
                                    value={
                                        version.assinaturas_requeridas?.join(
                                            ", ",
                                        ) || "Nenhuma"
                                    }
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
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
                    "relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-3xl bg-white shadow-2xl",
                    wide ? "max-w-6xl" : "max-w-2xl",
                ].join(" ")}
            >
                <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
                    <h2 className="font-bold text-slate-950">{title}</h2>

                    <button
                        type="button"
                        onClick={onClose}
                        className={iconButtonClass}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </header>

                <div className="p-6">{children}</div>
            </div>
        </div>
    );
}

function Kpi({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {label}
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-950">
                {value.toLocaleString("pt-PT")}
            </p>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    if (status === "publicado") {
        return <Badge tone="green">Publicado</Badge>;
    }

    if (status === "arquivado") {
        return <Badge tone="gray">Arquivado</Badge>;
    }

    return <Badge tone="amber">Rascunho</Badge>;
}

function Badge({
    children,
    tone,
    icon,
}: {
    children: ReactNode;
    tone: "green" | "blue" | "amber" | "gray";
    icon?: ReactNode;
}) {
    const tones = {
        green: "bg-emerald-50 text-emerald-700",

        blue: "bg-indigo-50 text-indigo-700",

        amber: "bg-amber-50 text-amber-700",

        gray: "bg-slate-100 text-slate-600",
    };

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${tones[tone]}`}
        >
            {icon}
            {children}
        </span>
    );
}

function InfoCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {label}
            </div>

            <div className="mt-1 text-sm font-medium text-slate-800">
                {value}
            </div>
        </div>
    );
}

function CheckField({
    checked,
    onChange,
    label,
}: {
    checked: boolean;
    onChange: (value: boolean) => void;
    label: string;
}) {
    return (
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700">
            <input
                type="checkbox"
                checked={checked}
                onChange={(event) => onChange(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600"
            />

            {label}
        </label>
    );
}

function TabButton({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`border-b-2 px-4 py-3 text-sm font-semibold ${
                active
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500"
            }`}
        >
            {children}
        </button>
    );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {label}
            </label>

            {children}
        </div>
    );
}

function FieldError({ children }: { children: ReactNode }) {
    return (
        <p className="mt-1.5 text-xs font-medium text-red-600">{children}</p>
    );
}

function IconButton({
    children,
    onClick,
    title,
    disabled = false,
    tone = "normal",
}: {
    children: ReactNode;
    onClick: () => void;
    title: string;
    disabled?: boolean;
    tone?: "normal" | "danger";
}) {
    return (
        <button
            type="button"
            title={title}
            onClick={onClick}
            disabled={disabled}
            className={`${iconButtonClass} ${
                tone === "danger" ? "text-red-600" : ""
            } disabled:opacity-40`}
        >
            {children}
        </button>
    );
}

function Th({ children }: { children: ReactNode }) {
    return (
        <th className="bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {children}
        </th>
    );
}

function Td({ children }: { children: ReactNode }) {
    return (
        <td className="px-5 py-4 align-top text-sm text-slate-600">
            {children}
        </td>
    );
}

function Empty({ text }: { text: string }) {
    return (
        <div className="p-14 text-center text-sm text-slate-500">{text}</div>
    );
}

function Loading() {
    return (
        <div className="flex justify-center py-16">
            <LoaderCircle className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
    );
}

function ErrorBox({ message }: { message: string }) {
    return (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {message}
        </div>
    );
}

function fieldError(error: unknown, field: string): string | null {
    if (!axios.isAxiosError(error)) {
        return null;
    }

    const data = error.response?.data as
        | {
              errors?: Record<string, string[]>;
          }
        | undefined;

    return data?.errors?.[field]?.[0] ?? null;
}

function errorMessage(error: unknown, fallback: string): string {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data as
            | {
                  message?: string;
                  errors?: Record<string, string[]>;
              }
            | undefined;

        const validation = data?.errors
            ? Object.values(data.errors).flat().filter(Boolean)
            : [];

        if (validation.length) {
            return validation.join(" ");
        }

        if (data?.message) {
            return data.message;
        }
    }

    return fallback;
}

function formatDate(value: string): string {
    return new Intl.DateTimeFormat("pt-PT", {
        dateStyle: "medium",

        timeStyle: "short",
    }).format(new Date(value));
}

const inputClass =
    "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

const textareaClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

const errorInputClass =
    "border-red-400 focus:border-red-500 focus:ring-red-500/10";

const primaryButton =
    "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButton =
    "inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50";

const iconButtonClass =
    "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50";
