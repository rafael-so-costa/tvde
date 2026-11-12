import ResourceId from '../components/ResourceId';
import {
    useEffect,
    useMemo,
    useState,
} from "react";
import {
    useNavigate,
    useSearchParams,
} from "react-router-dom";
import {
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import {
    AlertCircle,
    Eye,
    FileText,
    LoaderCircle,
    Pencil,
    PlayCircle,
    Plus,
    RefreshCw,
    Search,
    Settings2,
} from "lucide-react";
import api from "../lib/api";
import {
    useTenant,
} from "../contexts/TenantContext";
import {
    useContractTypes,
} from "../hooks/useContractTypes";
import {
    useCurrentPermissions,
} from "../hooks/useCurrentPermissions";
import ContratosSubnav from "../components/contratos/ContratosSubnav";
import ContratoDetailModal from "../components/contratos/ContratoDetailModal";
import ContratoFormModal from "../components/contratos/ContratoFormModal";
import ContractWizard from "../components/contratos/wizard/ContractWizard";
import AluguerWizard from "../components/alugueres/AluguerWizard";
import type {
    Contrato,
    ContratoStatus,
} from "../types/contrato";
import type {
    Aluguer,
    AluguerStatus,
} from "../types/aluguer";
import type {
    ChecklistRecord,
} from "../types/checklist";
import type {
    Empresa,
} from "../types/empresa";
import type {
    Motorista,
} from "../types/motorista";
import type {
    Proprietario,
} from "../types/proprietario";
import type {
    TemplateContrato,
} from "../types/template";
import type {
    TipoContrato,
} from "../types/tipo-contrato";
import type {
    Veiculo,
} from "../types/veiculo";

type StatusFilter =
    | "todos"
    | "pendentes"
    | ContratoStatus;

type TypeFilter =
    string;

const statusLabels: Record<
    ContratoStatus,
    string
> = {
    rascunho:
        "Rascunho",

    enviado:
        "Enviado",

    assinado:
        "Assinado",

    cancelado:
        "Cancelado",

    renovado:
        "Renovado",

    expirado:
        "Expirado",

    encerrado:
        "Encerrado",
};

const statusClasses: Record<
    ContratoStatus,
    string
> = {
    rascunho:
        "bg-slate-100 text-slate-700",

    enviado:
        "bg-amber-50 text-amber-700",

    assinado:
        "bg-emerald-50 text-emerald-700",

    cancelado:
        "bg-red-50 text-red-700",

    renovado:
        "bg-blue-50 text-blue-700",

    expirado:
        "bg-orange-50 text-orange-700",

    encerrado:
        "bg-slate-200 text-slate-600",
};

const legacyTypeLabels:
    Record<
        string,
        string
    > = {
        aluguer:
            "Aluguer",

        prestacao_servico:
            "Prestação",

        checklist_entrega:
            "Checklist entrega",

        checklist_devolucao:
            "Checklist devolução",
    };

const rentalStatusLabels:
    Record<
        AluguerStatus,
        string
    > = {
        rascunho: "Rascunho",
        ativo: "Ativo",
        finalizado: "Finalizado",
        cancelado: "Cancelado",
    };

export default function ContratosPage() {
    const {
        tenant,
    } =
        useTenant();

    const {
        can,
    } =
        useCurrentPermissions();

    const canManageRentalProcess =
        can(
            "alugueres",
            "configurar",
        );

    const navigate =
        useNavigate();

    const [
        searchParams,
        setSearchParams,
    ] =
        useSearchParams();

    const queryClient =
        useQueryClient();

    const [
        search,
        setSearch,
    ] =
        useState("");

    const [
        status,
        setStatus,
    ] =
        useState<StatusFilter>(
            () => {
                const value =
                    searchParams.get(
                        "status",
                    );

                if (
                    value ===
                    "pendentes"
                ) {
                    return "pendentes";
                }

                if (
                    value &&
                    value in
                        statusLabels
                ) {
                    return value as
                        ContratoStatus;
                }

                return "todos";
            },
        );

    const [
        type,
        setType,
    ] =
        useState<TypeFilter>(
            () =>
                searchParams.get(
                    "tipo",
                ) ??
                "todos",
        );

    const [
        selectedId,
        setSelectedId,
    ] =
        useState<
            string | null
        >(null);

    const [
        formOpen,
        setFormOpen,
    ] =
        useState(false);

    const [
        wizardOpen,
        setWizardOpen,
    ] =
        useState(false);

    const [
        rentalWizardId,
        setRentalWizardId,
    ] =
        useState<
            string | null
        >(null);

    const [
        startingRentalContractId,
        setStartingRentalContractId,
    ] =
        useState<
            string | null
        >(null);

    const [
        rentalProcessError,
        setRentalProcessError,
    ] =
        useState<
            string | null
        >(null);

    const [
        editing,
        setEditing,
    ] =
        useState<
            Contrato | null
        >(null);

    useEffect(() => {
        const contractId =
            searchParams.get(
                "contrato",
            );

        if (contractId) {
            setSelectedId(
                contractId,
            );
        }

        if (
            searchParams.get(
                "novo",
            ) === "1"
        ) {
            setWizardOpen(
                true
            );

            const next =
                new URLSearchParams(
                    searchParams
                );

            next.delete(
                "novo"
            );

            setSearchParams(
                next,
                {
                    replace: true,
                }
            );
        }
    }, [
        searchParams,
        setSearchParams,
    ]);

    const contractsQuery =
        useQuery({
            queryKey: [
                "contratos",
                tenant?.id,
            ],

            enabled:
                Boolean(
                    tenant?.id,
                ),

            queryFn:
                async () => {
                    const response =
                        await api.get(
                            "/api/contratos",
                        );

                    return response
                        .data
                        .data as Contrato[];
                },
        });

    const contractTypesQuery =
        useContractTypes({
            enabled:
                Boolean(
                    tenant?.id,
                ),

            includeInactive:
                true,
        });

    const templatesQuery =
        useQuery({
            queryKey: [
                "contract-form-templates",
                tenant?.id,
            ],

            enabled:
                Boolean(
                    tenant?.id &&
                        (
                            formOpen ||
                            Boolean(
                                rentalWizardId,
                            )
                        ),
                ),

            queryFn:
                async () => {
                    const response =
                        await api.get(
                            "/api/templates-contrato",
                        );

                    return response
                        .data
                        .data as TemplateContrato[];
                },
        });

    const motoristasQuery =
        useQuery({
            queryKey: [
                "contract-form-motoristas",
                tenant?.id,
            ],

            enabled:
                Boolean(
                    tenant?.id &&
                        (
                            formOpen ||
                            wizardOpen ||
                            Boolean(
                                rentalWizardId,
                            )
                        ),
                ),

            queryFn:
                async () => {
                    const response =
                        await api.get(
                            "/api/motoristas",
                        );

                    return response
                        .data
                        .data as Motorista[];
                },
        });

    const veiculosQuery =
        useQuery({
            queryKey: [
                "contract-form-veiculos",
                tenant?.id,
            ],

            enabled:
                Boolean(
                    tenant?.id &&
                        (
                            formOpen ||
                            wizardOpen ||
                            Boolean(
                                rentalWizardId,
                            )
                        ),
                ),

            queryFn:
                async () => {
                    const response =
                        await api.get(
                            "/api/veiculos",
                        );

                    return response
                        .data
                        .data as Veiculo[];
                },
        });

    const proprietariosQuery =
        useQuery({
            queryKey: [
                "contract-form-proprietarios",
                tenant?.id,
            ],

            enabled:
                Boolean(
                    tenant?.id &&
                        (
                            formOpen ||
                            wizardOpen ||
                            Boolean(
                                rentalWizardId,
                            )
                        ),
                ),

            queryFn:
                async () => {
                    const response =
                        await api.get(
                            "/api/proprietarios",
                        );

                    return response
                        .data
                        .data as Proprietario[];
                },
        });

    const empresasQuery =
        useQuery({
            queryKey: [
                "contract-form-empresas",
                tenant?.id,
            ],

            enabled:
                Boolean(
                    tenant?.id &&
                        (
                            formOpen ||
                            wizardOpen ||
                            Boolean(
                                rentalWizardId,
                            )
                        ),
                ),

            queryFn:
                async () => {
                    const response =
                        await api.get(
                            "/api/empresas",
                        );

                    return response
                        .data
                        .data as Empresa[];
                },
        });

    const alugueresQuery =
        useQuery({
            queryKey: [
                "alugueres",
                tenant?.id,
            ],

            enabled:
                Boolean(
                    tenant?.id &&
                    canManageRentalProcess,
                ),

            queryFn:
                async () => {
                    const response =
                        await api.get(
                            "/api/alugueres",
                        );

                    return response
                        .data
                        .data as Aluguer[];
                },
        });

    const checklistsQuery =
        useQuery({
            queryKey: [
                "checklists",
                tenant?.id,
            ],

            enabled:
                Boolean(
                    tenant?.id &&
                    rentalWizardId,
                ),

            queryFn:
                async () => {
                    const response =
                        await api.get(
                            "/api/checklists",
                        );

                    return response
                        .data
                        .data as ChecklistRecord[];
                },
        });

    async function refresh() {
        await Promise.all([
            queryClient
                .invalidateQueries({
                    queryKey: [
                        "contratos",
                        tenant?.id,
                    ],
                }),

            queryClient
                .invalidateQueries({
                    queryKey: [
                        "alugueres",
                        tenant?.id,
                    ],
                }),

            queryClient
                .invalidateQueries({
                    queryKey: [
                        "checklists",
                        tenant?.id,
                    ],
                }),
        ]);
    }

    const rentalByContract =
        useMemo(
            () =>
                new Map<
                    string,
                    Aluguer
                >(
                    (
                        alugueresQuery
                            .data ??
                        []
                    )
                        .filter(
                            (
                                aluguer,
                            ) =>
                                Boolean(
                                    aluguer
                                        .contrato_aluguer_id,
                                ),
                        )
                        .map(
                            (
                                aluguer,
                            ) => [
                                aluguer
                                    .contrato_aluguer_id!,
                                aluguer,
                            ],
                        ),
                ),
            [
                alugueresQuery.data,
            ],
        );

    async function openRentalProcess(
        contract:
            Contrato,
    ) {
        setRentalProcessError(
            null,
        );

        if (
            !canManageRentalProcess
        ) {
            setRentalProcessError(
                "Não possui permissão para gerir processos de aluguer.",
            );

            return;
        }

        const existing =
            rentalByContract
                .get(
                    contract.id,
                );

        if (existing) {
            if (
                existing.status ===
                "rascunho"
            ) {
                setRentalWizardId(
                    existing.id,
                );

                return;
            }

            setRentalProcessError(
                `O processo de aluguer deste contrato encontra-se ${rentalStatusLabels[
                    existing.status
                ].toLocaleLowerCase(
                    "pt-PT",
                )}.`,
            );

            return;
        }

        if (
            [
                "cancelado",
                "expirado",
                "encerrado",
                "renovado",
            ].includes(
                contract.status,
            )
        ) {
            setRentalProcessError(
                "Não é possível iniciar um novo processo operacional para este contrato.",
            );

            return;
        }

        setStartingRentalContractId(
            contract.id,
        );

        try {
            const response =
                await api.post(
                    "/api/alugueres",
                    {
                        contrato_aluguer_id:
                            contract.id,

                        motorista_id:
                            contract
                                .motorista_id,

                        veiculo_id:
                            contract
                                .veiculo_id,

                        proprietario_id:
                            contract
                                .proprietario_id,

                        data_inicio:
                            contract
                                .data_inicio
                                ?.slice(
                                    0,
                                    10,
                                ) ??
                            null,

                        data_fim:
                            contract
                                .data_fim
                                ?.slice(
                                    0,
                                    10,
                                ) ??
                            null,

                        rascunho_passo:
                            2,

                        rascunho_dados: {
                            origem:
                                "contratos",

                            contrato_aluguer_id:
                                contract.id,
                        },
                    },
                );

            const created =
                response.data
                    .data as Aluguer;

            await queryClient
                .invalidateQueries({
                    queryKey: [
                        "alugueres",
                        tenant?.id,
                    ],
                });

            setRentalWizardId(
                created.id,
            );
        } catch (
            requestError
        ) {
            setRentalProcessError(
                requestError instanceof
                    Error
                    ? requestError.message
                    : "Não foi possível iniciar o processo de aluguer.",
            );
        } finally {
            setStartingRentalContractId(
                null,
            );
        }
    }

    const contractTypesById =
        useMemo(
            () =>
                new Map<
                    string,
                    TipoContrato
                >(
                    (
                        contractTypesQuery
                            .data ??
                        []
                    ).map(
                        (
                            item,
                        ) => [
                            item.id,
                            item,
                        ],
                    ),
                ),
            [
                contractTypesQuery.data,
            ],
        );

    const contractTypesByCode =
        useMemo(
            () =>
                new Map<
                    string,
                    TipoContrato
                >(
                    (
                        contractTypesQuery
                            .data ??
                        []
                    ).map(
                        (
                            item,
                        ) => [
                            item.codigo,
                            item,
                        ],
                    ),
                ),
            [
                contractTypesQuery.data,
            ],
        );

    function contractTypeLabel(
        contract:
            Contrato,
    ): string {
        if (
            contract
                .tipo_contrato
                ?.nome
        ) {
            return contract
                .tipo_contrato
                .nome;
        }

        if (
            contract
                .tipo_contrato_id
        ) {
            const configured =
                contractTypesById
                    .get(
                        contract
                            .tipo_contrato_id,
                    );

            if (configured) {
                return configured
                    .nome;
            }
        }

        const byCode =
            contractTypesByCode
                .get(
                    contract.tipo,
                );

        if (byCode) {
            return byCode.nome;
        }

        return (
            legacyTypeLabels[
                contract.tipo
            ] ??
            humanizeCode(
                contract.tipo,
            )
        );
    }

    const typeOptions =
        useMemo(
            () => {
                const options =
                    new Map<
                        string,
                        string
                    >();

                for (
                    const contractType of
                    contractTypesQuery
                        .data ??
                    []
                ) {
                    options.set(
                        contractType
                            .codigo,

                        contractType
                            .nome,
                    );
                }

                for (
                    const contract of
                    contractsQuery.data ??
                    []
                ) {
                    if (
                        options.has(
                            contract
                                .tipo,
                        )
                    ) {
                        continue;
                    }

                    options.set(
                        contract.tipo,

                        legacyTypeLabels[
                            contract.tipo
                        ] ??
                            humanizeCode(
                                contract.tipo,
                            ),
                    );
                }

                return Array
                    .from(
                        options
                            .entries(),
                    )
                    .map(
                        ([
                            value,
                            label,
                        ]) => ({
                            value,
                            label,
                        }),
                    )
                    .sort(
                        (
                            a,
                            b,
                        ) =>
                            a.label
                                .localeCompare(
                                    b.label,
                                    "pt-PT",
                                ),
                    );
            },
            [
                contractTypesQuery.data,
                contractsQuery.data,
            ],
        );

    const contracts =
        useMemo(
            () => {
                const list =
                    contractsQuery
                        .data ??
                    [];

                const term =
                    search
                        .trim()
                        .toLocaleLowerCase(
                            "pt-PT",
                        );

                return list.filter(
                    (
                        contract,
                    ) => {
                        if (
                            status ===
                            "pendentes"
                        ) {
                            if (
                                contract.status !==
                                    "rascunho" &&
                                contract.status !==
                                    "enviado"
                            ) {
                                return false;
                            }
                        } else if (
                            status !==
                                "todos" &&
                            contract
                                .status !==
                                status
                        ) {
                            return false;
                        }

                        if (
                            type !==
                                "todos" &&
                            contract
                                .tipo !==
                                type
                        ) {
                            return false;
                        }

                        if (!term) {
                            return true;
                        }

                        const typeName =
                            contractTypeLabel(
                                contract,
                            );

                        return [
                            contract
                                .template
                                ?.nome,

                            typeName,

                            contract
                                .motorista
                                ?.nome_completo,

                            contract
                                .veiculo
                                ?.matricula,

                            contract
                                .veiculo
                                ?.marca,

                            contract
                                .veiculo
                                ?.modelo,

                            contract
                                .proprietario
                                ?.nome_completo,

                            contract
                                .proprietario
                                ?.nome_empresa,

                            contract
                                .status,

                            contract
                                .tipo,
                        ]
                            .filter(
                                Boolean,
                            )
                            .some(
                                (
                                    value,
                                ) =>
                                    String(
                                        value,
                                    )
                                        .toLocaleLowerCase(
                                            "pt-PT",
                                        )
                                        .includes(
                                            term,
                                        ),
                            );
                    },
                );
            },
            [
                contractsQuery.data,
                search,
                status,
                type,
                contractTypesById,
                contractTypesByCode,
            ],
        );

    if (!tenant) {
        return (
            <div className="max-w-7xl mx-auto">
            <ContratosSubnav />
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 flex gap-4">
                    <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />

                    <div>
                        <h1 className="font-semibold text-amber-900">
                            Selecione uma organização
                        </h1>

                        <p className="mt-1 text-sm text-amber-700">
                            Escolha uma organização antes de consultar
                            contratos.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const all =
        contractsQuery
            .data ??
        [];

    const selectedContract =
        selectedId
            ? all.find(
                  (
                      contract,
                  ) =>
                      contract.id ===
                      selectedId,
              ) ??
              null
            : null;

    const rentalWizardLoading =
        Boolean(
            rentalWizardId,
        ) &&
        (
            templatesQuery
                .isLoading ||
            motoristasQuery
                .isLoading ||
            veiculosQuery
                .isLoading ||
            empresasQuery
                .isLoading ||
            checklistsQuery
                .isLoading
        );

    const rentalWizardError =
        Boolean(
            rentalWizardId,
        ) &&
        (
            templatesQuery
                .isError ||
            motoristasQuery
                .isError ||
            veiculosQuery
                .isError ||
            empresasQuery
                .isError ||
            checklistsQuery
                .isError
        );

    const wizardLoading =
        motoristasQuery
            .isLoading ||
        veiculosQuery
            .isLoading ||
        proprietariosQuery
            .isLoading ||
        empresasQuery
            .isLoading;

    const wizardError =
        motoristasQuery
            .isError ||
        veiculosQuery
            .isError ||
        proprietariosQuery
            .isError ||
        empresasQuery
            .isError;

    return (
        <div className="max-w-7xl mx-auto">
            <ContratosSubnav />
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <p className="text-sm font-medium text-indigo-600 mb-2">
                        Documentação
                    </p>

                    <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                        Contratos
                    </h1>

                    <p className="mt-2 text-slate-500">
                        Contratos, assinaturas, versões e processos da
                        organização.
                    </p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <button
                        type="button"
                        onClick={() =>
                            navigate(
                                "/contratos/configuracao",
                            )
                        }
                        className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 flex items-center gap-2 hover:bg-slate-50"
                    >
                        <Settings2 className="w-4 h-4" />

                        Configurar contratos
                    </button>

                    <button
                        type="button"
                        disabled={
                            contractsQuery
                                .isFetching
                        }
                        onClick={
                            refresh
                        }
                        className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 flex items-center gap-2 disabled:opacity-50"
                    >
                        <RefreshCw
                            className={[
                                "w-4 h-4",

                                contractsQuery
                                    .isFetching
                                    ? "animate-spin"
                                    : "",
                            ].join(
                                " ",
                            )}
                        />

                        Atualizar
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setEditing(
                                null,
                            );

                            setWizardOpen(
                                true,
                            );
                        }}
                        className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />

                        Novo contrato
                    </button>
                </div>
            </div>

            {rentalProcessError && (
                <div className="mb-6 flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <span>
                        {
                            rentalProcessError
                        }
                    </span>

                    <button
                        type="button"
                        onClick={() =>
                            setRentalProcessError(
                                null,
                            )
                        }
                        className="shrink-0 font-semibold"
                    >
                        Fechar
                    </button>
                </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Stat
                    label="Total"
                    value={
                        all.length
                    }
                />

                <Stat
                    label="Rascunhos"
                    value={
                        all.filter(
                            (
                                item,
                            ) =>
                                item
                                    .status ===
                                "rascunho",
                        ).length
                    }
                />

                <Stat
                    label="Aguardando assinatura"
                    value={
                        all.filter(
                            (
                                item,
                            ) =>
                                item
                                    .status ===
                                "enviado",
                        ).length
                    }
                />

                <Stat
                    label="Assinados"
                    value={
                        all.filter(
                            (
                                item,
                            ) =>
                                item
                                    .status ===
                                "assinado",
                        ).length
                    }
                />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="p-5 border-b border-slate-200 grid lg:grid-cols-[1fr_220px_220px] gap-3">
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                        <input
                            value={
                                search
                            }
                            onChange={(
                                event,
                            ) =>
                                setSearch(
                                    event
                                        .target
                                        .value,
                                )
                            }
                            placeholder="Pesquisar motorista, matrícula, template, tipo..."
                            className="w-full h-11 rounded-xl border border-slate-200 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                        />
                    </div>

                    <select
                        value={
                            status
                        }
                        onChange={(
                            event,
                        ) =>
                            setStatus(
                                event
                                    .target
                                    .value as StatusFilter,
                            )
                        }
                        className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"
                    >
                        <option value="todos">
                            Todos os estados
                        </option>

                        <option value="pendentes">
                            Pendentes
                        </option>

                        {Object.entries(
                            statusLabels,
                        ).map(
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

                    <select
                        value={
                            type
                        }
                        onChange={(
                            event,
                        ) =>
                            setType(
                                event
                                    .target
                                    .value,
                            )
                        }
                        className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"
                    >
                        <option value="todos">
                            Todos os tipos
                        </option>

                        {typeOptions.map(
                            (
                                option,
                            ) => (
                                <option
                                    key={
                                        option
                                            .value
                                    }
                                    value={
                                        option
                                            .value
                                    }
                                >
                                    {
                                        option
                                            .label
                                    }
                                </option>
                            ),
                        )}
                    </select>
                </div>

                {contractsQuery
                    .isLoading ? (
                    <div className="py-20 flex justify-center">
                        <LoaderCircle className="w-8 h-8 animate-spin text-indigo-600" />
                    </div>
                ) : contractsQuery
                      .isError ? (
                    <div className="py-16 px-6 text-center">
                        <AlertCircle className="w-10 h-10 mx-auto text-red-500" />

                        <h3 className="mt-3 font-semibold text-slate-900">
                            Não foi possível carregar os contratos
                        </h3>
                    </div>
                ) : contracts
                      .length ===
                  0 ? (
                    <div className="py-20 px-6 text-center">
                        <FileText className="w-12 h-12 mx-auto text-indigo-400" />

                        <h3 className="mt-4 font-semibold text-slate-900">
                            Nenhum contrato encontrado
                        </h3>

                        <p className="mt-2 text-sm text-slate-500">
                            Os contratos criados pela plataforma aparecerão
                            aqui.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <Th>
                                        Contrato
                                    </Th>

                                    <Th>
                                        Motorista
                                    </Th>

                                    <Th>
                                        Veículo
                                    </Th>

                                    <Th>
                                        Período
                                    </Th>

                                    <Th>
                                        Processo
                                    </Th>

                                    <Th>
                                        Estado
                                    </Th>

                                    <Th>
                                        Ações
                                    </Th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {contracts.map(
                                    (
                                        contract,
                                    ) => {
                                        const typeLabel =
                                            contractTypeLabel(
                                                contract,
                                            );

                                        const rentalProcess =
                                            rentalByContract
                                                .get(
                                                    contract.id,
                                                ) ??
                                            null;

                                        return (
                                            <tr
                                                key={
                                                    contract
                                                        .id
                                                }
                                                className="hover:bg-slate-50 transition"
                                            >
                                                <td className="px-5 py-4">
                                                    <div className="font-semibold text-sm text-slate-900">
                                                        {contract
                                                            .template
                                                            ?.nome ??
                                                            typeLabel}
                                                    </div>
                                                    <div className="mt-1 flex flex-wrap items-center gap-2">
                                                        {contract.documento?.codigo && (
                                                            <span className="rounded-md bg-indigo-50 px-2 py-0.5 font-mono text-xs text-indigo-700">
                                                                Documento {contract.documento.codigo}
                                                            </span>
                                                        )}
                                                        <ResourceId id={contract.id} />
                                                    </div>

                                                    <div className="mt-1 text-xs text-slate-400">
                                                        {
                                                            typeLabel
                                                        }{" "}
                                                        · v
                                                        {
                                                            contract
                                                                .versao_atual
                                                        }
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4 text-sm text-slate-600">
                                                    {contract
                                                        .motorista
                                                        ?.nome_completo ??
                                                        "—"}
                                                </td>

                                                <td className="px-5 py-4">
                                                    <div className="text-sm font-medium text-slate-800">
                                                        {contract
                                                            .veiculo
                                                            ?.matricula ??
                                                            "—"}
                                                    </div>

                                                    {contract
                                                        .veiculo && (
                                                        <div className="mt-1 text-xs text-slate-400">
                                                            {
                                                                contract
                                                                    .veiculo
                                                                    .marca
                                                            }{" "}
                                                            {
                                                                contract
                                                                    .veiculo
                                                                    .modelo
                                                            }
                                                        </div>
                                                    )}
                                                </td>

                                                <td className="px-5 py-4 text-sm text-slate-600 whitespace-nowrap">
                                                    {dateLabel(
                                                        contract
                                                            .data_inicio,
                                                    )}

                                                    {
                                                        " → "
                                                    }

                                                    {dateLabel(
                                                        contract
                                                            .data_fim,
                                                    )}
                                                </td>

                                                <td className="px-5 py-4">
                                                    {contract
                                                        .checklist_process_run ? (
                                                        <span
                                                            className={[
                                                                "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",

                                                                contract
                                                                    .checklist_process_run
                                                                    .status ===
                                                                "concluido"
                                                                    ? "bg-emerald-50 text-emerald-700"
                                                                    : "bg-amber-50 text-amber-700",
                                                            ].join(
                                                                " ",
                                                            )}
                                                        >
                                                            {contract
                                                                .checklist_process_run
                                                                .status ===
                                                            "concluido"
                                                                ? "Concluído"
                                                                : "Em andamento"}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-slate-400">
                                                            Sem checklist
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="px-5 py-4">
                                                    <span
                                                        className={[
                                                            "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",

                                                            statusClasses[
                                                                contract
                                                                    .status
                                                            ],
                                                        ].join(
                                                            " ",
                                                        )}
                                                    >
                                                        {
                                                            statusLabels[
                                                                contract
                                                                    .status
                                                            ]
                                                        }
                                                    </span>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setSelectedId(
                                                                    contract
                                                                        .id,
                                                                )
                                                            }
                                                            className="h-9 px-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                                                        >
                                                            <Eye className="w-4 h-4" />

                                                            Ver
                                                        </button>

                                                        {isRentalContract(
                                                            contract,
                                                        ) &&
                                                            canManageRentalProcess &&
                                                            (
                                                                !rentalProcess ||
                                                                rentalProcess
                                                                    .status ===
                                                                    "rascunho"
                                                            ) && (
                                                                <button
                                                                    type="button"
                                                                    disabled={
                                                                        startingRentalContractId ===
                                                                            contract
                                                                                .id ||
                                                                        alugueresQuery
                                                                            .isLoading
                                                                    }
                                                                    onClick={() =>
                                                                        void openRentalProcess(
                                                                            contract,
                                                                        )
                                                                    }
                                                                    className="h-9 px-3 rounded-lg bg-emerald-50 text-sm font-medium text-emerald-700 flex items-center gap-2 disabled:opacity-50"
                                                                >
                                                                    {startingRentalContractId ===
                                                                    contract
                                                                        .id ? (
                                                                        <LoaderCircle className="w-4 h-4 animate-spin" />
                                                                    ) : (
                                                                        <PlayCircle className="w-4 h-4" />
                                                                    )}

                                                                    {rentalProcess
                                                                        ? "Processo"
                                                                        : "Iniciar aluguer"}
                                                                </button>
                                                            )}

                                                        {isRentalContract(
                                                            contract,
                                                        ) &&
                                                            rentalProcess &&
                                                            rentalProcess
                                                                .status !==
                                                                "rascunho" && (
                                                                <span
                                                                    className={[
                                                                        "inline-flex h-9 items-center rounded-lg px-3 text-xs font-semibold",

                                                                        rentalProcess
                                                                            .status ===
                                                                        "ativo"
                                                                            ? "bg-emerald-50 text-emerald-700"
                                                                            : rentalProcess
                                                                                    .status ===
                                                                                "finalizado"
                                                                              ? "bg-slate-100 text-slate-600"
                                                                              : "bg-red-50 text-red-700",
                                                                    ].join(
                                                                        " ",
                                                                    )}
                                                                >
                                                                    Aluguer{" "}
                                                                    {
                                                                        rentalStatusLabels[
                                                                            rentalProcess
                                                                                .status
                                                                        ]
                                                                    }
                                                                </span>
                                                            )}

                                                        {contract
                                                            .status ===
                                                            "rascunho" &&
                                                            !contract
                                                                .bloqueado && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setEditing(
                                                                            contract,
                                                                        );

                                                                        setFormOpen(
                                                                            true,
                                                                        );
                                                                    }}
                                                                    className="h-9 px-3 rounded-lg bg-indigo-50 text-sm font-medium text-indigo-700 flex items-center gap-2"
                                                                >
                                                                    <Pencil className="w-4 h-4" />

                                                                    Editar
                                                                </button>
                                                            )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    },
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {selectedId && (
                <ContratoDetailModal
                    id={
                        selectedId
                    }
                    onClose={() => {
                        setSelectedId(
                            null,
                        );

                        if (
                            searchParams.has(
                                "contrato",
                            )
                        ) {
                            const next =
                                new URLSearchParams(
                                    searchParams,
                                );

                            next.delete(
                                "contrato",
                            );

                            setSearchParams(
                                next,
                                {
                                    replace:
                                        true,
                                },
                            );
                        }
                    }}
                    onChanged={
                        refresh
                    }
                    rentalProcess={
                        selectedContract
                            ? rentalByContract
                                  .get(
                                      selectedContract
                                          .id,
                                  ) ??
                              null
                            : null
                    }
                    canManageRentalProcess={
                        canManageRentalProcess
                    }
                    onOpenRentalProcess={() => {
                        if (
                            selectedContract
                        ) {
                            void openRentalProcess(
                                selectedContract,
                            );
                        }
                    }}
                />
            )}

            {wizardOpen &&
                wizardLoading && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm">
                        <div className="rounded-2xl bg-white px-8 py-7 text-center shadow-2xl">
                            <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-indigo-600" />

                            <p className="mt-3 text-sm font-medium text-slate-700">
                                A carregar dados do contrato...
                            </p>
                        </div>
                    </div>
                )}

            {wizardOpen &&
                !wizardLoading &&
                wizardError && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
                        <div className="w-full max-w-md rounded-2xl bg-white p-7 text-center shadow-2xl">
                            <AlertCircle className="mx-auto h-10 w-10 text-red-500" />

                            <h3 className="mt-4 font-semibold text-slate-900">
                                Não foi possível carregar os dados
                            </h3>

                            <p className="mt-2 text-sm text-slate-500">
                                Verifique as permissões de empresas,
                                proprietários, motoristas e veículos.
                            </p>

                            <button
                                type="button"
                                onClick={() =>
                                    setWizardOpen(
                                        false,
                                    )
                                }
                                className="mt-5 h-10 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                )}

            {wizardOpen &&
                !wizardLoading &&
                !wizardError && (
                    <ContractWizard
                        open={
                            wizardOpen
                        }
                        empresas={
                            empresasQuery
                                .data ??
                            []
                        }
                        proprietarios={
                            proprietariosQuery
                                .data ??
                            []
                        }
                        motoristas={
                            motoristasQuery
                                .data ??
                            []
                        }
                        veiculos={
                            veiculosQuery
                                .data ??
                            []
                        }
                        onClose={() =>
                            setWizardOpen(
                                false,
                            )
                        }
                        onSuccess={async (
                            contract,
                        ) => {
                            await refresh();

                            setSelectedId(
                                contract
                                    .id,
                            );
                        }}
                    />
                )}

            {rentalWizardId &&
                rentalWizardLoading && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/65 backdrop-blur-sm">
                        <div className="rounded-2xl bg-white px-8 py-7 text-center shadow-2xl">
                            <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-emerald-600" />

                            <p className="mt-3 text-sm font-medium text-slate-700">
                                A carregar processo de aluguer...
                            </p>
                        </div>
                    </div>
                )}

            {rentalWizardId &&
                !rentalWizardLoading &&
                rentalWizardError && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
                        <div className="w-full max-w-md rounded-2xl bg-white p-7 text-center shadow-2xl">
                            <AlertCircle className="mx-auto h-10 w-10 text-red-500" />

                            <h3 className="mt-4 font-semibold text-slate-900">
                                Não foi possível carregar o processo
                            </h3>

                            <p className="mt-2 text-sm text-slate-500">
                                Verifique as permissões de alugueres, contratos, checklists, motoristas e veículos.
                            </p>

                            <button
                                type="button"
                                onClick={() =>
                                    setRentalWizardId(
                                        null,
                                    )
                                }
                                className="mt-5 h-10 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                )}

            {rentalWizardId &&
                !rentalWizardLoading &&
                !rentalWizardError && (
                    <AluguerWizard
                        id={
                            rentalWizardId
                        }
                        templates={
                            templatesQuery
                                .data ??
                            []
                        }
                        motoristas={
                            motoristasQuery
                                .data ??
                            []
                        }
                        veiculos={
                            veiculosQuery
                                .data ??
                            []
                        }
                        empresas={
                            empresasQuery
                                .data ??
                            []
                        }
                        checklists={
                            checklistsQuery
                                .data ??
                            []
                        }
                        onClose={() =>
                            setRentalWizardId(
                                null,
                            )
                        }
                        onChanged={
                            refresh
                        }
                        onActivated={async () => {
                            await refresh();

                            setRentalWizardId(
                                null,
                            );
                        }}
                    />
                )}

            {formOpen && (
                <ContratoFormModal
                    open={
                        formOpen
                    }
                    contract={
                        editing
                    }
                    templates={
                        templatesQuery
                            .data ??
                        []
                    }
                    motoristas={
                        motoristasQuery
                            .data ??
                        []
                    }
                    veiculos={
                        veiculosQuery
                            .data ??
                        []
                    }
                    proprietarios={
                        proprietariosQuery
                            .data ??
                        []
                    }
                    empresas={
                        empresasQuery
                            .data ??
                        []
                    }
                    onClose={() => {
                        setFormOpen(
                            false,
                        );

                        setEditing(
                            null,
                        );
                    }}
                    onSuccess={async (
                        contract,
                    ) => {
                        await refresh();

                        setSelectedId(
                            contract
                                .id,
                        );
                    }}
                />
            )}
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
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">
                {label}
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-950">
                {value}
            </p>
        </div>
    );
}

function Th({
    children,
}: {
    children: string;
}) {
    return (
        <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
            {children}
        </th>
    );
}

function dateLabel(
    value:
        string | null,
): string {
    if (!value) {
        return "—";
    }

    return new Intl.DateTimeFormat(
        "pt-PT",
    ).format(
        new Date(
            `${value.slice(
                0,
                10,
            )}T12:00:00`,
        ),
    );
}

function isRentalContract(
    contract:
        Contrato,
): boolean {
    const values = [
        contract.tipo,
        contract
            .tipo_contrato
            ?.codigo,
        contract
            .tipo_contrato
            ?.slug,
    ]
        .filter(
            (
                value,
            ): value is string =>
                Boolean(
                    value,
                ),
        )
        .map(
            (
                value,
            ) =>
                value
                    .trim()
                    .toLocaleLowerCase(
                        "pt-PT",
                    ),
        );

    return values.includes(
        "aluguer",
    );
}

function humanizeCode(
    value: string,
): string {
    return value
        .replace(
            /[_-]+/g,
            " ",
        )
        .trim()
        .replace(
            /\b\w/g,
            (
                character,
            ) =>
                character
                    .toUpperCase(),
        );
}
