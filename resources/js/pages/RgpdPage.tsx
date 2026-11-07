import axios from "axios";
import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    FileText,
    History,
    LoaderCircle,
    LockKeyhole,
    Plus,
    RefreshCw,
    ShieldCheck,
} from "lucide-react";

import ContratosSubnav from "../components/contratos/ContratosSubnav";
import { useTenant } from "../contexts/TenantContext";
import { useCurrentPermissions } from "../hooks/useCurrentPermissions";
import api from "../lib/api";

type Finalidade =
    | "imagem"
    | "voz"
    | "localizacao"
    | "dados_sensiveis";

type Escolha =
    | "autorizo"
    | "nao_autorizo"
    | "nao_aplicavel";

type TitularTipo =
    | "motorista"
    | "proprietario"
    | "colaborador"
    | "outro";

type Modo = "presencial" | "remota";

interface Evento {
    id: string;
    finalidade: string;
    tipo: string;
    escolha: string;
    ocorrido_em: string;
}

interface Registo {
    id: string;
    titular_tipo: TitularTipo;
    titular_id: string | null;
    titular_nome: string | null;
    estado: string;
    versao_documento: string;
    documento_sha256: string;
    created_at: string;
    eventos?: Evento[];
}

interface Assinatura {
    id: string;
    modo: Modo;
    status: string;
    signatario_nome: string;
    signatario_email: string | null;
    assinado_em: string | null;
}

interface ListResponse {
    data: Registo[];
    pagination: {
        total: number;
        current_page: number;
        last_page: number;
    };
}

interface DetailResponse {
    data: {
        registo: Registo;
        assinatura: Assinatura | null;
    };
}

interface Pessoa {
    id: string;
    nome_completo?: string;
    nome?: string;
    name?: string;
}

interface Formulario {
    titular_tipo: TitularTipo;
    titular_id: string;
    titular_nome: string;

    escolhas: Record<
        Finalidade,
        Escolha | ""
    >;

    finalidades_especificas: Record<
        "localizacao" |
        "dados_sensiveis" |
        "artigo_6" |
        "artigo_9",
        string
    >;
}

const finalidades: Finalidade[] = [
    "imagem",
    "voz",
    "localizacao",
    "dados_sensiveis",
];

const nomes: Record<Finalidade, string> = {
    imagem: "Utilização de imagem",
    voz: "Utilização de voz",
    localizacao: "Localização",
    dados_sensiveis: "Categorias especiais de dados",
};

const tipos: Record<TitularTipo, string> = {
    motorista: "Motorista",
    proprietario: "Proprietário",
    colaborador: "Colaborador",
    outro: "Outro titular",
};

const urls: Record<
    Exclude<TitularTipo, "outro">,
    string
> = {
    motorista: "/api/motoristas",
    proprietario: "/api/proprietarios",
    colaborador: "/api/funcionarios",
};

const card =
    "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";

const input =
    "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none";

const primary =
    "inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50";

const secondary =
    "inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50";

function novoFormulario(): Formulario {
    return {
        titular_tipo: "outro",
        titular_id: "",
        titular_nome: "",

        escolhas: {
            imagem: "",
            voz: "",
            localizacao: "",
            dados_sensiveis: "",
        },

        finalidades_especificas: {
            localizacao: "",
            dados_sensiveis: "",
            artigo_6: "",
            artigo_9: "",
        },
    };
}

function erro(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const errors: unknown =
            error.response?.data?.errors;

        if (
            errors &&
            typeof errors === "object"
        ) {
            const values =
                Object.values(errors).flat();

            const first = values.find(
                (value) =>
                    typeof value === "string"
            );

            if (typeof first === "string") {
                return first;
            }
        }

        return (
            error.response?.data?.message ??
            "Não foi possível concluir a operação."
        );
    }

    return "Não foi possível concluir a operação.";
}

function dataHora(
    value: string | null | undefined
): string {
    if (!value) {
        return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return new Intl.DateTimeFormat(
        "pt-PT",
        {
            dateStyle: "short",
            timeStyle: "short",
        }
    ).format(date);
}

function nomePessoa(pessoa: Pessoa): string {
    return (
        pessoa.nome_completo ??
        pessoa.nome ??
        pessoa.name ??
        pessoa.id
    );
}

export default function RgpdPage() {
    const { tenant } = useTenant();

    const { can } = useCurrentPermissions();

    const client = useQueryClient();

    const canRead = can(
        "templates",
        "visualizar"
    );

    const canWrite = can(
        "templates",
        "configurar"
    );

    const [formOpen, setFormOpen] =
        useState(false);

    const [form, setForm] =
        useState<Formulario>(novoFormulario);

    const [selectedId, setSelectedId] =
        useState<string | null>(null);

    const [message, setMessage] =
        useState("");

    const [errorMessage, setErrorMessage] =
        useState("");

    const [modo, setModo] =
        useState<Modo>("presencial");

    const [signerName, setSignerName] =
        useState("");

    const [signerEmail, setSignerEmail] =
        useState("");

    /*
     * FROTAPRO_4R921_RGPD_REACT_FIX
     *
     * A pagina apenas utiliza a API.
     * Nao ativa o modulo no backend.
     * Nao confirma consentimentos automaticamente.
     */

    const list = useQuery({
        queryKey: [
            "rgpd-list",
            tenant?.id,
        ],

        enabled:
            Boolean(tenant?.id) &&
            canRead,

        retry: false,

        queryFn: async (): Promise<ListResponse> => {
            const response = await api.get(
                "/api/rgpd"
            );

            return response.data as ListResponse;
        },
    });

    const detail = useQuery({
        queryKey: [
            "rgpd-detail",
            tenant?.id,
            selectedId,
        ],

        enabled:
            Boolean(
                tenant?.id &&
                selectedId &&
                list.isSuccess
            ) &&
            canRead,

        retry: false,

        queryFn: async (): Promise<DetailResponse> => {
            const response = await api.get(
                `/api/rgpd/${selectedId}`
            );

            return response.data as DetailResponse;
        },
    });

    const people = useQuery({
        queryKey: [
            "rgpd-people",
            tenant?.id,
            form.titular_tipo,
        ],

        enabled:
            Boolean(
                tenant?.id &&
                formOpen &&
                list.isSuccess &&
                form.titular_tipo !== "outro"
            ) &&
            canWrite,

        retry: false,

        queryFn: async (): Promise<Pessoa[]> => {
            if (form.titular_tipo === "outro") {
                return [];
            }

            const response = await api.get(
                urls[form.titular_tipo]
            );

            const value: unknown =
                response.data?.data;

            if (Array.isArray(value)) {
                return value as Pessoa[];
            }

            if (
                value &&
                typeof value === "object" &&
                "data" in value &&
                Array.isArray(value.data)
            ) {
                return value.data as Pessoa[];
            }

            return [];
        },
    });

    const create = useMutation({
        mutationFn: async (
            payload: Record<string, unknown>
        ): Promise<Registo> => {
            const response = await api.post(
                "/api/rgpd/rascunhos",
                payload
            );

            return response.data.data as Registo;
        },

        onSuccess: async (record) => {
            setForm(novoFormulario());
            setFormOpen(false);
            setSelectedId(record.id);
            setSignerName(
                record.titular_nome ?? ""
            );

            setMessage(
                "Rascunho criado. Ainda não constitui consentimento assinado."
            );

            await client.invalidateQueries({
                queryKey: [
                    "rgpd-list",
                    tenant?.id,
                ],
            });
        },
    });

    const prepare = useMutation({
        mutationFn: async (payload: {
            id: string;
            modo: Modo;
            signatario_nome: string;
            signatario_email?: string;
        }) => {
            const { id, ...body } = payload;

            await api.post(
                `/api/rgpd/${id}/assinatura/preparar`,
                body
            );
        },

        onSuccess: async () => {
            setMessage(
                "Pedido preparado, mas a assinatura ainda não foi efetuada."
            );

            await client.invalidateQueries({
                queryKey: [
                    "rgpd-detail",
                    tenant?.id,
                    selectedId,
                ],
            });
        },
    });

    const revoke = useMutation({
        mutationFn: async ({
            id,
            finalidade,
        }: {
            id: string;
            finalidade: Finalidade;
        }) => {
            await api.post(
                `/api/rgpd/${id}/escolhas/${finalidade}/revogar`
            );
        },

        onSuccess: async () => {
            setMessage(
                "Escolha retirada do rascunho; histórico preservado."
            );

            await client.invalidateQueries({
                queryKey: [
                    "rgpd-detail",
                    tenant?.id,
                    selectedId,
                ],
            });
        },
    });

    useEffect(() => {
        setSelectedId(null);
        setFormOpen(false);
        setForm(novoFormulario());
        setErrorMessage("");
        setMessage("");
    }, [tenant?.id]);

    const selected = detail.data?.data;

    const validChoices =
        finalidades.every(
            (purpose) =>
                form.escolhas[purpose] !== ""
        );

    const validPerson =
        form.titular_tipo === "outro"
            ? form.titular_nome.trim().length > 0
            : form.titular_id.length > 0;

    const validLocation =
        form.escolhas.localizacao !== "autorizo" ||
        form.finalidades_especificas
            .localizacao.trim().length > 0;

    const validSensitive =
        form.escolhas.dados_sensiveis !== "autorizo" ||
        (
            [
                "dados_sensiveis",
                "artigo_6",
                "artigo_9",
            ] as const
        ).every(
            (key) =>
                form.finalidades_especificas[
                    key
                ].trim().length > 0
        );

    const canSubmit =
        canWrite &&
        list.isSuccess &&
        validPerson &&
        validChoices &&
        validLocation &&
        validSensitive &&
        !create.isPending;

    function changeChoice(
        purpose: Finalidade,
        value: Escolha | ""
    ) {
        setForm(
            (previous) => ({
                ...previous,

                escolhas: {
                    ...previous.escolhas,
                    [purpose]: value,
                },
            })
        );
    }

    function changeSpecific(
        key: keyof Formulario[
            "finalidades_especificas"
        ],
        value: string
    ) {
        setForm(
            (previous) => ({
                ...previous,

                finalidades_especificas: {
                    ...previous.finalidades_especificas,
                    [key]: value,
                },
            })
        );
    }

    async function submit(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (!canSubmit) {
            return;
        }

        setErrorMessage("");
        setMessage("");

        const specific: Record<
            string,
            string
        > = {};

        if (
            form.escolhas.localizacao ===
            "autorizo"
        ) {
            specific.localizacao =
                form.finalidades_especificas
                    .localizacao.trim();
        }

        if (
            form.escolhas.dados_sensiveis ===
            "autorizo"
        ) {
            specific.dados_sensiveis =
                form.finalidades_especificas
                    .dados_sensiveis.trim();

            specific.artigo_6 =
                form.finalidades_especificas
                    .artigo_6.trim();

            specific.artigo_9 =
                form.finalidades_especificas
                    .artigo_9.trim();
        }

        try {
            await create.mutateAsync({
                titular_tipo:
                    form.titular_tipo,

                titular_id:
                    form.titular_tipo === "outro"
                        ? null
                        : form.titular_id,

                titular_nome:
                    form.titular_nome.trim(),

                escolhas:
                    form.escolhas,

                finalidades_especificas:
                    specific,
            });
        }
        catch (cause) {
            setErrorMessage(
                erro(cause)
            );
        }
    }

    async function prepareSignature() {
        if (
            !selectedId ||
            !canWrite ||
            !selected ||
            selected.assinatura
        ) {
            return;
        }

        setErrorMessage("");
        setMessage("");

        try {
            await prepare.mutateAsync({
                id: selectedId,

                modo,

                signatario_nome:
                    signerName.trim(),

                ...(
                    modo === "remota"
                        ? {
                            signatario_email:
                                signerEmail.trim(),
                        }
                        : {}
                ),
            });
        }
        catch (cause) {
            setErrorMessage(
                erro(cause)
            );
        }
    }

    async function revokeChoice(
        purpose: Finalidade
    ) {
        if (
            !selectedId ||
            !canWrite ||
            selected?.registo.estado !==
                "rascunho"
        ) {
            return;
        }

        if (
            !window.confirm(
                `Retirar a escolha de ${nomes[purpose]} deste rascunho?`
            )
        ) {
            return;
        }

        setErrorMessage("");
        setMessage("");

        try {
            await revoke.mutateAsync({
                id: selectedId,
                finalidade: purpose,
            });
        }
        catch (cause) {
            setErrorMessage(
                erro(cause)
            );
        }
    }

    return (
        <div className="mx-auto max-w-7xl space-y-6 pb-12">
            <ContratosSubnav />

            <header className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <p className="text-sm font-semibold text-indigo-600">
                        Proteção de dados
                    </p>

                    <h1 className="mt-2 flex items-center gap-2 text-3xl font-bold text-slate-950">
                        <ShieldCheck className="h-8 w-8" />
                        RGPD
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        Titulares, escolhas independentes e histórico de assinaturas.
                    </p>
                </div>

                {canWrite && list.isSuccess && (
                    <button
                        type="button"
                        className={primary}
                        onClick={() =>
                            setFormOpen(!formOpen)
                        }
                    >
                        <Plus className="h-4 w-4" />
                        Novo rascunho
                    </button>
                )}
            </header>

            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                <p className="flex items-center gap-2 font-bold">
                    <LockKeyhole className="h-5 w-5" />
                    Módulo em preparação
                </p>

                <p className="mt-2">
                    As decisões guardadas pelo operador são rascunhos.
                    Apenas a confirmação posterior do titular pode
                    concluir a assinatura. As funcionalidades RGPD
                    ainda não estão disponíveis para utilização definitiva.
                </p>
            </section>

            {!tenant && (
                <section className={card}>
                    Seleciona uma organização para continuar.
                </section>
            )}

            {tenant && !canRead && (
                <section className={card}>
                    Não tens permissão para consultar registos RGPD.
                </section>
            )}

            {tenant && canRead && list.isLoading && (
                <section className={card}>
                    <LoaderCircle className="inline h-5 w-5 animate-spin" />
                    A verificar disponibilidade...
                </section>
            )}

            {tenant && canRead && list.isError && (
                <section className={card}>
                    <h2 className="font-bold">
                        RGPD operacional indisponível
                    </h2>

                    <p className="mt-2 text-sm text-slate-600">
                        A API ainda está desativada ou indisponível
                        neste ambiente. Nenhum novo rascunho
                        pode ser criado.
                    </p>

                    <button
                        type="button"
                        className={`${secondary} mt-4`}
                        onClick={() =>
                            void list.refetch()
                        }
                    >
                        <RefreshCw className="h-4 w-4" />
                        Verificar novamente
                    </button>
                </section>
            )}

            {errorMessage && (
                <p
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
                >
                    {errorMessage}
                </p>
            )}

            {message && (
                <p
                    role="status"
                    className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900"
                >
                    {message}
                </p>
            )}

            {tenant && canRead && list.isSuccess && (
                <>
                    <section className="grid gap-4 sm:grid-cols-3">
                        <div className={card}>
                            <p className="text-sm text-slate-500">
                                Total
                            </p>
                            <p className="mt-2 text-2xl font-bold">
                                {list.data.pagination.total}
                            </p>
                        </div>

                        <div className={card}>
                            <p className="text-sm text-slate-500">
                                Rascunhos nesta página
                            </p>
                            <p className="mt-2 text-2xl font-bold">
                                {list.data.data.filter(
                                    (item) =>
                                        item.estado ===
                                        "rascunho"
                                ).length}
                            </p>
                        </div>

                        <div className={card}>
                            <p className="text-sm text-slate-500">
                                Assinados nesta página
                            </p>
                            <p className="mt-2 text-2xl font-bold">
                                {list.data.data.filter(
                                    (item) =>
                                        item.estado ===
                                        "assinado"
                                ).length}
                            </p>
                        </div>
                    </section>

                    {formOpen && canWrite && (
                        <form
                            className={`${card} space-y-5`}
                            onSubmit={(event) =>
                                void submit(event)
                            }
                        >
                            <h2 className="text-lg font-bold">
                                Novo rascunho RGPD
                            </h2>

                            <div className="grid gap-4 md:grid-cols-2">
                                <label className="block text-sm font-semibold">
                                    Tipo de titular

                                    <select
                                        className={`${input} mt-2`}
                                        value={form.titular_tipo}
                                        onChange={(event) =>
                                            setForm(
                                                (previous) => ({
                                                    ...previous,
                                                    titular_tipo:
                                                        event.target.value as TitularTipo,
                                                    titular_id: "",
                                                    titular_nome: "",
                                                })
                                            )
                                        }
                                    >
                                        {(Object.keys(tipos) as TitularTipo[]).map(
                                            (tipo) => (
                                                <option
                                                    key={tipo}
                                                    value={tipo}
                                                >
                                                    {tipos[tipo]}
                                                </option>
                                            )
                                        )}
                                    </select>
                                </label>

                                {form.titular_tipo !== "outro" && (
                                    <label className="block text-sm font-semibold">
                                        Titular do cadastro

                                        <select
                                            className={`${input} mt-2`}
                                            required
                                            value={form.titular_id}
                                            onChange={(event) => {
                                                const id =
                                                    event.target.value;

                                                const found =
                                                    people.data?.find(
                                                        (item) =>
                                                            item.id === id
                                                    );

                                                setForm(
                                                    (previous) => ({
                                                        ...previous,
                                                        titular_id: id,
                                                        titular_nome:
                                                            found
                                                                ? nomePessoa(found)
                                                                : "",
                                                    })
                                                );
                                            }}
                                        >
                                            <option value="">
                                                Seleciona um titular
                                            </option>

                                            {(people.data ?? []).map(
                                                (item) => (
                                                    <option
                                                        key={item.id}
                                                        value={item.id}
                                                    >
                                                        {nomePessoa(item)}
                                                    </option>
                                                )
                                            )}
                                        </select>

                                        {people.isError && (
                                            <span className="mt-1 block text-xs text-red-700">
                                                Não foi possível consultar
                                                os titulares. Verifica
                                                as permissões.
                                            </span>
                                        )}
                                    </label>
                                )}

                                <label className="block text-sm font-semibold">
                                    Nome do titular

                                    <input
                                        className={`${input} mt-2`}
                                        required
                                        maxLength={255}
                                        readOnly={
                                            form.titular_tipo !== "outro"
                                        }
                                        value={form.titular_nome}
                                        onChange={(event) =>
                                            setForm(
                                                (previous) => ({
                                                    ...previous,
                                                    titular_nome:
                                                        event.target.value,
                                                })
                                            )
                                        }
                                    />
                                </label>
                            </div>

                            <div>
                                <h3 className="font-semibold">
                                    Autorizações independentes
                                </h3>

                                <p className="mt-1 text-sm text-slate-500">
                                    Nenhuma opção é pré-selecionada.
                                    Cada finalidade exige uma escolha expressa.
                                </p>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                {finalidades.map((purpose) => (
                                    <label
                                        className="block text-sm font-semibold"
                                        key={purpose}
                                    >
                                        {nomes[purpose]}

                                        <select
                                            required
                                            className={`${input} mt-2`}
                                            value={
                                                form.escolhas[purpose]
                                            }
                                            onChange={(event) =>
                                                changeChoice(
                                                    purpose,
                                                    event.target.value as
                                                        Escolha | ""
                                                )
                                            }
                                        >
                                            <option value="">
                                                Seleciona uma opção
                                            </option>

                                            <option value="autorizo">
                                                Autorizo
                                            </option>

                                            <option value="nao_autorizo">
                                                Não autorizo
                                            </option>

                                            <option value="nao_aplicavel">
                                                Não aplicável
                                            </option>
                                        </select>
                                    </label>
                                ))}
                            </div>

                            {form.escolhas.localizacao ===
                                "autorizo" && (
                                <label className="block text-sm font-semibold">
                                    Finalidade específica da localização

                                    <textarea
                                        className={`${input} mt-2`}
                                        rows={3}
                                        maxLength={500}
                                        required
                                        value={
                                            form.finalidades_especificas
                                                .localizacao
                                        }
                                        onChange={(event) =>
                                            changeSpecific(
                                                "localizacao",
                                                event.target.value
                                            )
                                        }
                                    />
                                </label>
                            )}

                            {form.escolhas.dados_sensiveis ===
                                "autorizo" && (
                                <div className="grid gap-4 md:grid-cols-2">
                                    {(
                                        [
                                            "dados_sensiveis",
                                            "artigo_6",
                                            "artigo_9",
                                        ] as const
                                    ).map((key) => (
                                        <label
                                            className="block text-sm font-semibold"
                                            key={key}
                                        >
                                            {key === "dados_sensiveis"
                                                ? "Finalidade específica"
                                                : key === "artigo_6"
                                                ? "Fundamento do artigo 6.º"
                                                : "Condição do artigo 9.º"}

                                            <textarea
                                                className={`${input} mt-2`}
                                                required
                                                rows={2}
                                                maxLength={500}
                                                value={
                                                    form.finalidades_especificas[
                                                        key
                                                    ]
                                                }
                                                onChange={(event) =>
                                                    changeSpecific(
                                                        key,
                                                        event.target.value
                                                    )
                                                }
                                            />
                                        </label>
                                    ))}
                                </div>
                            )}

                            <div className="flex flex-wrap gap-3">
                                <button
                                    type="submit"
                                    className={primary}
                                    disabled={!canSubmit}
                                >
                                    {create.isPending
                                        ? "A guardar..."
                                        : "Criar rascunho"}
                                </button>

                                <button
                                    type="button"
                                    className={secondary}
                                    onClick={() =>
                                        setFormOpen(false)
                                    }
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    )}

                    <div className="grid gap-5 lg:grid-cols-5">
                        <section className={`${card} lg:col-span-2`}>
                            <h2 className="mb-4 flex items-center gap-2 font-bold">
                                <FileText className="h-5 w-5" />
                                Registos RGPD
                            </h2>

                            {list.data.data.length === 0 && (
                                <p className="text-sm text-slate-500">
                                    Ainda não existem registos.
                                </p>
                            )}

                            <div className="space-y-2">
                                {list.data.data.map((record) => (
                                    <button
                                        key={record.id}
                                        type="button"
                                        className={
                                            `w-full rounded-xl border p-3 text-left ` +
                                            (
                                                selectedId === record.id
                                                    ? "border-indigo-400 bg-indigo-50"
                                                    : "border-slate-200 hover:bg-slate-50"
                                            )
                                        }
                                        onClick={() => {
                                            setSelectedId(
                                                record.id
                                            );

                                            setSignerName(
                                                record.titular_nome ?? ""
                                            );

                                            setSignerEmail("");
                                            setMessage("");
                                            setErrorMessage("");
                                        }}
                                    >
                                        <span className="block font-semibold">
                                            {record.titular_nome ||
                                                tipos[record.titular_tipo]}
                                        </span>

                                        <span className="mt-1 block text-xs text-slate-500">
                                            {record.estado}
                                            {" · "}v{record.versao_documento}
                                            {" · "}
                                            {dataHora(record.created_at)}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </section>

                        <section className={`${card} lg:col-span-3`}>
                            {!selectedId && (
                                <p className="flex items-center gap-2 text-sm text-slate-500">
                                    <History className="h-5 w-5" />
                                    Seleciona um registo para consultar
                                    o histórico.
                                </p>
                            )}

                            {selectedId && detail.isLoading && (
                                <p className="text-sm">
                                    A carregar histórico...
                                </p>
                            )}

                            {selectedId && detail.isError && (
                                <p className="text-sm text-red-700">
                                    Não foi possível consultar o registo.
                                </p>
                            )}

                            {selected && (
                                <div className="space-y-6">
                                    <div>
                                        <h2 className="text-lg font-bold">
                                            {selected.registo.titular_nome ||
                                                tipos[
                                                    selected.registo.titular_tipo
                                                ]}
                                        </h2>

                                        <p className="mt-2 text-sm text-slate-500">
                                            RGPD v
                                            {selected.registo.versao_documento}
                                            {" · "}
                                            {selected.registo.estado}
                                        </p>

                                        <p className="mt-2 break-all font-mono text-xs text-slate-400">
                                            SHA-256:{" "}
                                            {selected.registo.documento_sha256}
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        <h3 className="font-semibold">
                                            Histórico de decisões
                                        </h3>

                                        {(
                                            selected.registo.eventos ?? []
                                        ).map((event) => {
                                            const purpose =
                                                event.finalidade as Finalidade;

                                            const withdrawn = (
                                                selected.registo.eventos ?? []
                                            ).some(
                                                (item) =>
                                                    item.finalidade ===
                                                        event.finalidade &&
                                                    item.tipo === "revogacao"
                                            );

                                            const canWithdraw =
                                                canWrite &&
                                                selected.registo.estado ===
                                                    "rascunho" &&
                                                event.tipo === "decisao" &&
                                                event.escolha === "autorizo" &&
                                                !withdrawn;

                                            return (
                                                <div
                                                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"
                                                    key={event.id}
                                                >
                                                    <div>
                                                        <p className="text-sm font-semibold">
                                                            {nomes[purpose] ??
                                                                event.finalidade}
                                                        </p>

                                                        <p className="text-sm text-slate-600">
                                                            {event.tipo}
                                                            {" · "}
                                                            {event.escolha}
                                                        </p>

                                                        <p className="text-xs text-slate-400">
                                                            {dataHora(
                                                                event.ocorrido_em
                                                            )}
                                                        </p>
                                                    </div>

                                                    {canWithdraw && (
                                                        <button
                                                            type="button"
                                                            className={secondary}
                                                            disabled={
                                                                revoke.isPending
                                                            }
                                                            onClick={() =>
                                                                void revokeChoice(
                                                                    purpose
                                                                )
                                                            }
                                                        >
                                                            Retirar escolha
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="border-t border-slate-100 pt-4">
                                        <h3 className="font-semibold">
                                            Assinatura do titular
                                        </h3>

                                        {selected.assinatura ? (
                                            <div className="mt-3 rounded-xl border border-slate-200 p-3 text-sm">
                                                <p>
                                                    Modo:{" "}
                                                    {selected.assinatura.modo}
                                                </p>

                                                <p>
                                                    Estado:{" "}
                                                    {selected.assinatura.status}
                                                </p>

                                                <p>
                                                    Signatário:{" "}
                                                    {selected.assinatura.signatario_nome}
                                                </p>

                                                <p>
                                                    Data:{" "}
                                                    {dataHora(
                                                        selected.assinatura.assinado_em
                                                    )}
                                                </p>
                                            </div>
                                        ) : selected.registo.estado ===
                                              "rascunho" &&
                                          canWrite ? (
                                            <div className="mt-3 space-y-3">
                                                <label className="block text-sm font-semibold">
                                                    Modo

                                                    <select
                                                        className={`${input} mt-2`}
                                                        value={modo}
                                                        onChange={(event) =>
                                                            setModo(
                                                                event.target.value as Modo
                                                            )
                                                        }
                                                    >
                                                        <option value="presencial">
                                                            Presencial
                                                        </option>

                                                        <option value="remota">
                                                            Remota
                                                        </option>
                                                    </select>
                                                </label>

                                                <label className="block text-sm font-semibold">
                                                    Nome do signatário

                                                    <input
                                                        className={`${input} mt-2`}
                                                        value={signerName}
                                                        maxLength={255}
                                                        onChange={(event) =>
                                                            setSignerName(
                                                                event.target.value
                                                            )
                                                        }
                                                    />
                                                </label>

                                                {modo === "remota" && (
                                                    <label className="block text-sm font-semibold">
                                                        E-mail

                                                        <input
                                                            className={`${input} mt-2`}
                                                            type="email"
                                                            value={signerEmail}
                                                            maxLength={190}
                                                            onChange={(event) =>
                                                                setSignerEmail(
                                                                    event.target.value
                                                                )
                                                            }
                                                        />
                                                    </label>
                                                )}

                                                <button
                                                    type="button"
                                                    className={primary}
                                                    disabled={
                                                        prepare.isPending ||
                                                        !signerName.trim() ||
                                                        (
                                                            modo === "remota" &&
                                                            !signerEmail.trim()
                                                        )
                                                    }
                                                    onClick={() =>
                                                        void prepareSignature()
                                                    }
                                                >
                                                    Preparar assinatura
                                                </button>

                                                <p className="text-xs text-slate-500">
                                                    A preparação não confirma
                                                    a assinatura nem envia OTP.
                                                </p>
                                            </div>
                                        ) : (
                                            <p className="mt-2 text-sm text-slate-500">
                                                Não há assinatura disponível
                                                para preparar.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </section>
                    </div>
                </>
            )}
        </div>
    );
}
