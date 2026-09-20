import axios from 'axios';
import {
    useEffect,
    useMemo,
    useState,
} from 'react';
import {
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import {
    AlertCircle,
    ArrowRight,
    Check,
    CheckCircle2,
    Circle,
    ClipboardCheck,
    FileText,
    LoaderCircle,
    X,
} from 'lucide-react';
import api from '../../lib/api';
import ChecklistFormModal from '../checklists/ChecklistFormModal';
import SignaturePad from '../checklists/SignaturePad';
import type {
    Aluguer,
    ChecklistProcessRun,
    ChecklistProcessRunItem,
    Contrato,
} from '../../types/aluguer';
import type {
    ChecklistRecord,
} from '../../types/checklist';
import type {
    Empresa,
} from '../../types/empresa';
import type {
    Motorista,
} from '../../types/motorista';
import type {
    SignaturePlaceholder,
    TemplateContrato,
} from '../../types/template';
import type {
    Veiculo,
} from '../../types/veiculo';
import type {
    ReactNode,
} from 'react';

interface Props {
    id: string;
    templates: TemplateContrato[];
    motoristas: Motorista[];
    veiculos: Veiculo[];
    empresas: Empresa[];
    checklists: ChecklistRecord[];
    onClose: () => void;
    onChanged: () => Promise<void>;
    onActivated: () => Promise<void>;
}

interface ContractContext {
    motoristaId: string;
    veiculoId: string;
    proprietarioId: string | null;
    dataInicio: string;
    dataFim: string | null;
}

const signaturePlaceholders:
    SignaturePlaceholder[] = [
        'ASSINATURA_MOTORISTA',
        'ASSINATURA_PROPRIETARIO',
        'ASSINATURA_EMPRESA',
        'ASSINATURA_TESTEMUNHA',
    ];

const automaticTypes = [
    'assinatura',
    'gerar_documento',
    'checklist_veiculo',
];

function apiError(
    error: unknown,
    fallback =
        'Não foi possível concluir a operação.'
): string {
    if (
        axios.isAxiosError(
            error
        )
    ) {
        const errors =
            error.response?.data
                ?.errors;

        if (
            errors &&
            typeof errors ===
                'object'
        ) {
            const first =
                Object.values(
                    errors
                )
                    .flat()
                    .find(
                        (
                            item
                        ) =>
                            typeof item ===
                            'string'
                    );

            if (
                typeof first ===
                'string'
            ) {
                return first;
            }
        }

        return (
            error.response?.data
                ?.message ??
            fallback
        );
    }

    return fallback;
}

function normalizeToken(
    value: string
): string {
    return value
        .normalize('NFD')
        .replace(
            /[\u0300-\u036f]/g,
            ''
        )
        .trim()
        .toUpperCase()
        .replace(
            /[^A-Z0-9]+/g,
            '_'
        )
        .replace(
            /_(DA|DO|DE|DAS|DOS)_/g,
            '_'
        )
        .replace(
            /_+/g,
            '_'
        )
        .replace(
            /^_|_$/g,
            ''
        );
}

function requiredSignatures(
    template:
        | TemplateContrato
        | null
): SignaturePlaceholder[] {
    if (!template) {
        return [];
    }

    const tokens =
        new Set<string>();

    const content =
        template
            .conteudo_original ??
        '';

    const patterns = [
        /\{\{\s*([^{}]+?)\s*\}\}/g,
        /\[\[\s*([^[\]]+?)\s*\]\]/g,
        /<<\s*([^<>]+?)\s*>>/g,
        /__([A-Z0-9_\sÀ-ÿ]+)__/g,
        /\(([A-Z0-9_\sÀ-ÿ]{2,})\)/g,
    ];

    patterns.forEach(
        (
            pattern
        ) => {
            for (
                const match of content.matchAll(
                    pattern
                )
            ) {
                if (
                    match[1]
                ) {
                    tokens.add(
                        normalizeToken(
                            match[1]
                        )
                    );
                }
            }
        }
    );

    for (
        const field of template
            .campos_detectados ??
        []
    ) {
        if (
            field?.name
        ) {
            tokens.add(
                normalizeToken(
                    field.name
                )
            );
        }

        if (
            field?.placeholder
        ) {
            tokens.add(
                normalizeToken(
                    field.placeholder
                )
            );
        }
    }

    return signaturePlaceholders
        .filter(
            (
                placeholder
            ) =>
                tokens.has(
                    placeholder
                )
        );
}

function searchValue(
    value: string
): string {
    return value
        .normalize('NFD')
        .replace(
            /[\u0300-\u036f]/g,
            ''
        )
        .toLowerCase();
}

function templateScore(
    template: TemplateContrato,
    kind:
        | 'aluguer'
        | 'prestacao_servico'
): number {
    const text =
        searchValue(
            [
                template.nome,
                template
                    .perfil
                    ?.nome ??
                    '',
            ].join(' ')
        );

    if (
        kind ===
        'aluguer'
    ) {
        if (
            text.includes(
                'aluguer'
            ) ||
            text.includes(
                'aluguel'
            )
        ) {
            return 10;
        }
    }

    if (
        kind ===
        'prestacao_servico'
    ) {
        if (
            text.includes(
                'prestacao'
            ) ||
            text.includes(
                'servico'
            )
        ) {
            return 10;
        }
    }

    return 0;
}

function contractReady(
    contract:
        | Contrato
        | null
        | undefined
): boolean {
    return (
        contract?.status ===
            'assinado' &&
        contract
            .checklist_process_run
            ?.status ===
            'concluido'
    );
}

export default function AluguerWizard({
    id,
    templates,
    motoristas,
    veiculos,
    empresas,
    checklists,
    onClose,
    onChanged,
    onActivated,
}: Props) {
    const queryClient =
        useQueryClient();

    const [
        step,
        setStep,
    ] = useState(1);

    const [
        deliveryOpen,
        setDeliveryOpen,
    ] = useState(false);

    const [
        deliveryRecord,
        setDeliveryRecord,
    ] =
        useState<ChecklistRecord | null>(
            null
        );

    const [
        activationError,
        setActivationError,
    ] =
        useState<string | null>(
            null
        );

    const [
        activating,
        setActivating,
    ] = useState(false);

    const aluguerQuery =
        useQuery({
            queryKey: [
                'aluguer',
                id,
            ],

            queryFn:
                async () => {
                    const response =
                        await api.get(
                            `/api/alugueres/${id}`
                        );

                    return response
                        .data
                        .data as Aluguer;
                },
        });

    const aluguer =
        aluguerQuery.data;

    const contractAluguerQuery =
        useQuery({
            queryKey: [
                'contrato',
                aluguer
                    ?.contrato_aluguer_id,
            ],

            enabled:
                Boolean(
                    aluguer
                        ?.contrato_aluguer_id
                ),

            queryFn:
                async () => {
                    const response =
                        await api.get(
                            `/api/contratos/${aluguer!.contrato_aluguer_id}`
                        );

                    return response
                        .data
                        .data as Contrato;
                },
        });

    const contractPrestacaoQuery =
        useQuery({
            queryKey: [
                'contrato',
                aluguer
                    ?.contrato_prestacao_id,
            ],

            enabled:
                Boolean(
                    aluguer
                        ?.contrato_prestacao_id
                ),

            queryFn:
                async () => {
                    const response =
                        await api.get(
                            `/api/contratos/${aluguer!.contrato_prestacao_id}`
                        );

                    return response
                        .data
                        .data as Contrato;
                },
        });

    useEffect(() => {
        if (!aluguer) {
            return;
        }

        let next =
            aluguer
                .rascunho_passo ||
            1;

        if (
            !aluguer
                .contrato_aluguer_id
        ) {
            next = 1;
        } else if (
            !aluguer
                .contrato_prestacao_id &&
            next > 2
        ) {
            next = 2;
        } else if (
            !aluguer
                .checklist_entrega_id &&
            next > 3
        ) {
            next = 3;
        }

        setStep(
            Math.min(
                Math.max(
                    next,
                    1
                ),
                4
            )
        );
    }, [
        aluguer?.id,
        aluguer
            ?.contrato_aluguer_id,
        aluguer
            ?.contrato_prestacao_id,
        aluguer
            ?.checklist_entrega_id,
        aluguer
            ?.rascunho_passo,
    ]);

    const checklistDraftId =
        typeof aluguer
            ?.rascunho_dados
            ?.checklist_entrega_rascunho_id ===
        'string'
            ? aluguer
                  .rascunho_dados
                  .checklist_entrega_rascunho_id
            : null;

    const checklistDraft =
        checklists.find(
            (
                item
            ) =>
                item.id ===
                checklistDraftId
        ) ??
        null;

    async function refetchEverything() {
    await Promise.all([
        aluguerQuery.refetch(),

        queryClient
            .invalidateQueries({
                queryKey: [
                    'contrato',
                ],
            }),

        queryClient
            .invalidateQueries({
                queryKey: [
                    'checklists',
                ],
            }),

        onChanged(),
    ]);
}

    async function patchAluguer(
        payload: Record<
            string,
            unknown
        >
    ) {
        await api.patch(
            `/api/alugueres/${id}`,
            payload
        );

        await aluguerQuery
            .refetch();
    }

    async function advance(
        next: number
    ) {
        await patchAluguer({
            rascunho_passo:
                next,
        });

        setStep(
            next
        );
    }

    async function attachContract(
        kind:
            | 'aluguer'
            | 'prestacao_servico',
        contract: Contrato,
        context: ContractContext
    ) {
        if (
            kind ===
            'aluguer'
        ) {
            await patchAluguer({
                motorista_id:
                    context.motoristaId,
                veiculo_id:
                    context.veiculoId,
                proprietario_id:
                    context.proprietarioId,
                contrato_aluguer_id:
                    contract.id,
                data_inicio:
                    context.dataInicio,
                data_fim:
                    context.dataFim,
                rascunho_passo:
                    1,
            });
        } else {
            await patchAluguer({
                contrato_prestacao_id:
                    contract.id,
                rascunho_passo:
                    2,
            });
        }

        await refetchEverything();
    }

    async function handleDeliverySuccess(
        record?: ChecklistRecord
    ) {
        if (!record) {
            return;
        }

        const draftData = {
            ...(
                aluguer
                    ?.rascunho_dados ??
                {}
            ),
        };

        if (
            record.estado ===
            'finalizado'
        ) {
            delete draftData
                .checklist_entrega_rascunho_id;

            await patchAluguer({
                checklist_entrega_id:
                    record.id,
                rascunho_passo:
                    4,
                rascunho_dados:
                    draftData,
            });

            setStep(4);
        } else {
            draftData
                .checklist_entrega_rascunho_id =
                record.id;

            await patchAluguer({
                rascunho_passo:
                    3,
                rascunho_dados:
                    draftData,
            });
        }

        await refetchEverything();
    }

    async function activate() {
        if (!aluguer) {
            return;
        }

        setActivationError(
            null
        );

        setActivating(
            true
        );

        try {
            await api.post(
                `/api/alugueres/${id}/ativar`,
                {
                    motorista_id:
                        aluguer.motorista_id,
                    veiculo_id:
                        aluguer.veiculo_id,
                    proprietario_id:
                        aluguer.proprietario_id,
                    contrato_aluguer_id:
                        aluguer.contrato_aluguer_id,
                    contrato_prestacao_id:
                        aluguer.contrato_prestacao_id,
                    checklist_entrega_id:
                        aluguer.checklist_entrega_id,
                    data_inicio:
                        aluguer.data_inicio,
                    data_fim:
                        aluguer.data_fim,
                    observacoes:
                        aluguer.observacoes,
                }
            );

            await onActivated();

            onClose();
        } catch (
            error
        ) {
            setActivationError(
                apiError(
                    error,
                    'Não foi possível ativar o aluguer.'
                )
            );
        } finally {
            setActivating(
                false
            );
        }
    }

    if (
        aluguerQuery.isLoading
    ) {
        return (
            <Overlay>
                <div className="bg-white rounded-2xl p-12">
                    <LoaderCircle className="w-8 h-8 animate-spin text-indigo-600" />
                </div>
            </Overlay>
        );
    }

    if (
        !aluguer ||
        aluguerQuery.isError
    ) {
        return (
            <Overlay>
                <div className="bg-white rounded-2xl p-8 max-w-lg w-full">
                    <AlertCircle className="w-10 h-10 text-red-500" />

                    <p className="mt-4 text-slate-700">
                        Não foi possível carregar o aluguer.
                    </p>

                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                        className="mt-5 h-10 px-4 rounded-xl bg-slate-900 text-white"
                    >
                        Fechar
                    </button>
                </div>
            </Overlay>
        );
    }

    return (
        <>
            <Overlay>
                <div className="relative w-full max-w-7xl max-h-[96vh] overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col">
                    <header className="px-5 sm:px-7 py-5 border-b border-slate-200 flex items-center justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                                Novo Aluguer
                            </p>

                            <h2 className="mt-1 text-xl font-bold text-slate-950">
                                Processo de aluguer
                            </h2>
                        </div>

                        <button
                            type="button"
                            onClick={
                                onClose
                            }
                            className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </header>

                    <div className="border-b border-slate-200 px-5 sm:px-7">
                        <div className="grid grid-cols-4">
                            <StepTab
                                number={
                                    1
                                }
                                label="Contrato de Aluguer"
                                active={
                                    step ===
                                    1
                                }
                                complete={
                                    contractReady(
                                        contractAluguerQuery
                                            .data
                                    )
                                }
                                onClick={() =>
                                    setStep(
                                        1
                                    )
                                }
                            />

                            <StepTab
                                number={
                                    2
                                }
                                label="Prestação"
                                active={
                                    step ===
                                    2
                                }
                                complete={
                                    contractReady(
                                        contractPrestacaoQuery
                                            .data
                                    )
                                }
                                disabled={
                                    !aluguer
                                        .contrato_aluguer_id
                                }
                                onClick={() =>
                                    setStep(
                                        2
                                    )
                                }
                            />

                            <StepTab
                                number={
                                    3
                                }
                                label="Checklist"
                                active={
                                    step ===
                                    3
                                }
                                complete={
                                    Boolean(
                                        aluguer
                                            .checklist_entrega_id
                                    )
                                }
                                disabled={
                                    !aluguer
                                        .contrato_prestacao_id
                                }
                                onClick={() =>
                                    setStep(
                                        3
                                    )
                                }
                            />

                            <StepTab
                                number={
                                    4
                                }
                                label="Resumo"
                                active={
                                    step ===
                                    4
                                }
                                complete={
                                    aluguer.status ===
                                    'ativo'
                                }
                                disabled={
                                    !aluguer
                                        .checklist_entrega_id
                                }
                                onClick={() =>
                                    setStep(
                                        4
                                    )
                                }
                            />
                        </div>
                    </div>

                    <main className="flex-1 overflow-y-auto p-5 sm:p-7">
                        {step ===
                            1 && (
                            <ContractStep
                                kind="aluguer"
                                aluguer={
                                    aluguer
                                }
                                contract={
                                    contractAluguerQuery
                                        .data ??
                                    null
                                }
                                loading={
                                    contractAluguerQuery
                                        .isFetching
                                }
                                templates={
                                    templates
                                }
                                motoristas={
                                    motoristas
                                }
                                veiculos={
                                    veiculos
                                }
                                empresas={
                                    empresas
                                }
                                onCreated={
                                    attachContract
                                }
                                onRefresh={
                                    refetchEverything
                                }
                                onNext={() =>
                                    advance(
                                        2
                                    )
                                }
                            />
                        )}

                        {step ===
                            2 && (
                            <ContractStep
                                kind="prestacao_servico"
                                aluguer={
                                    aluguer
                                }
                                contract={
                                    contractPrestacaoQuery
                                        .data ??
                                    null
                                }
                                loading={
                                    contractPrestacaoQuery
                                        .isFetching
                                }
                                templates={
                                    templates
                                }
                                motoristas={
                                    motoristas
                                }
                                veiculos={
                                    veiculos
                                }
                                empresas={
                                    empresas
                                }
                                onCreated={
                                    attachContract
                                }
                                onRefresh={
                                    refetchEverything
                                }
                                onNext={() =>
                                    advance(
                                        3
                                    )
                                }
                            />
                        )}

                        {step ===
                            3 && (
                            <DeliveryStep
                                aluguer={
                                    aluguer
                                }
                                draft={
                                    checklistDraft
                                }
                                onOpen={(
                                    record
                                ) => {
                                    setDeliveryRecord(
                                        record
                                    );

                                    setDeliveryOpen(
                                        true
                                    );
                                }}
                            />
                        )}

                        {step ===
                            4 && (
                            <SummaryStep
                                aluguer={
                                    aluguer
                                }
                                contratoAluguer={
                                    contractAluguerQuery
                                        .data ??
                                    null
                                }
                                contratoPrestacao={
                                    contractPrestacaoQuery
                                        .data ??
                                    null
                                }
                                error={
                                    activationError
                                }
                                activating={
                                    activating
                                }
                                onActivate={
                                    activate
                                }
                            />
                        )}
                    </main>
                </div>
            </Overlay>

            <ChecklistFormModal
                open={
                    deliveryOpen
                }
                tipo="entrega"
                record={
                    deliveryRecord
                }
                initialMotoristaId={
                    aluguer
                        .motorista_id
                }
                initialVeiculoId={
                    aluguer
                        .veiculo_id
                }
                lockEntities
                records={
                    checklists
                }
                motoristas={
                    motoristas
                }
                veiculos={
                    veiculos
                }
                onClose={() => {
                    setDeliveryOpen(
                        false
                    );

                    setDeliveryRecord(
                        null
                    );
                }}
                onSuccess={
                    handleDeliverySuccess
                }
            />
        </>
    );
}

function ContractStep({
    kind,
    aluguer,
    contract,
    loading,
    templates,
    motoristas,
    veiculos,
    empresas,
    onCreated,
    onRefresh,
    onNext,
}: {
    kind:
        | 'aluguer'
        | 'prestacao_servico';
    aluguer: Aluguer;
    contract: Contrato | null;
    loading: boolean;
    templates: TemplateContrato[];
    motoristas: Motorista[];
    veiculos: Veiculo[];
    empresas: Empresa[];
    onCreated: (
        kind:
            | 'aluguer'
            | 'prestacao_servico',
        contract: Contrato,
        context: ContractContext
    ) => Promise<void>;
    onRefresh: () => Promise<void>;
    onNext: () => Promise<void>;
}) {
    const title =
        kind ===
        'aluguer'
            ? 'Contrato de Aluguer'
            : 'Contrato de Prestação de Serviços';

    if (
        contract
    ) {
        return (
            <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                    <p className="text-sm text-indigo-600 font-medium">
                        {title}
                    </p>

                    <h3 className="mt-1 text-2xl font-bold text-slate-950">
                        Executar checklist do contrato
                    </h3>
                </div>

                <ContractProgress
                    contract={
                        contract
                    }
                    refreshing={
                        loading
                    }
                    onRefresh={
                        onRefresh
                    }
                />

                <div className="mt-6 flex justify-end">
                    <button
                        type="button"
                        disabled={
                            !contractReady(
                                contract
                            )
                        }
                        onClick={
                            onNext
                        }
                        className="h-11 px-5 rounded-xl bg-indigo-600 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-40"
                    >
                        Continuar
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <ContractCreation
            kind={
                kind
            }
            title={
                title
            }
            aluguer={
                aluguer
            }
            templates={
                templates
            }
            motoristas={
                motoristas
            }
            veiculos={
                veiculos
            }
            empresas={
                empresas
            }
            onCreated={
                onCreated
            }
        />
    );
}

function ContractCreation({
    kind,
    title,
    aluguer,
    templates,
    motoristas,
    veiculos,
    empresas,
    onCreated,
}: {
    kind:
        | 'aluguer'
        | 'prestacao_servico';
    title: string;
    aluguer: Aluguer;
    templates: TemplateContrato[];
    motoristas: Motorista[];
    veiculos: Veiculo[];
    empresas: Empresa[];
    onCreated: (
        kind:
            | 'aluguer'
            | 'prestacao_servico',
        contract: Contrato,
        context: ContractContext
    ) => Promise<void>;
}) {
    const sortedTemplates =
        useMemo(
            () =>
                [
                    ...templates,
                ].sort(
                    (
                        a,
                        b
                    ) =>
                        templateScore(
                            b,
                            kind
                        ) -
                        templateScore(
                            a,
                            kind
                        )
                ),
            [
                templates,
                kind,
            ]
        );

    const [
        templateId,
        setTemplateId,
    ] = useState('');

    const [
        motoristaId,
        setMotoristaId,
    ] = useState(
        aluguer
            .motorista_id ??
            ''
    );

    const [
        veiculoId,
        setVeiculoId,
    ] = useState(
        aluguer
            .veiculo_id ??
            ''
    );

    const [
        dataInicio,
        setDataInicio,
    ] = useState(
        aluguer
            .data_inicio
            ?.slice(
                0,
                10
            ) ??
            new Date()
                .toISOString()
                .slice(
                    0,
                    10
                )
    );

    const [
        dataFim,
        setDataFim,
    ] = useState(
        aluguer
            .data_fim
            ?.slice(
                0,
                10
            ) ??
            ''
    );

    const [
        empresaId,
        setEmpresaId,
    ] = useState(
        empresas[0]
            ?.id ??
            ''
    );

    const [
        signatureImages,
        setSignatureImages,
    ] = useState<
        Partial<
            Record<
                SignaturePlaceholder,
                string
            >
        >
    >({});

    const [
        witnessName,
        setWitnessName,
    ] = useState('');

    const [
        witnessEmail,
        setWitnessEmail,
    ] = useState('');

    const [
        error,
        setError,
    ] =
        useState<string | null>(
            null
        );

    const [
        saving,
        setSaving,
    ] = useState(false);

    useEffect(() => {
        if (
            templateId ||
            sortedTemplates.length ===
                0
        ) {
            return;
        }

        const preferred =
            sortedTemplates.find(
                (
                    template
                ) =>
                    templateScore(
                        template,
                        kind
                    ) >
                    0
            ) ??
            sortedTemplates[0];

        setTemplateId(
            preferred.id
        );
    }, [
        sortedTemplates,
        templateId,
        kind,
    ]);

    useEffect(() => {
        if (
            !empresaId &&
            empresas[0]
        ) {
            setEmpresaId(
                empresas[0].id
            );
        }
    }, [
        empresas,
        empresaId,
    ]);

    const selectedTemplate =
        sortedTemplates.find(
            (
                template
            ) =>
                template.id ===
                templateId
        ) ??
        null;

    const selectedVehicle =
        veiculos.find(
            (
                vehicle
            ) =>
                vehicle.id ===
                veiculoId
        ) ??
        null;

    const ownerId =
        selectedVehicle
            ?.proprietario_id ??
        aluguer
            .proprietario_id ??
        null;

    const signatures =
        requiredSignatures(
            selectedTemplate
        );

    const process =
        selectedTemplate
            ?.checklist_process_template ??
        null;

    const unsupportedItems =
        process?.items.filter(
            (
                item
            ) =>
                item.obrigatorio &&
                (
                    item.tipo ===
                        'gerar_documento' ||
                    item.tipo ===
                        'checklist_veiculo'
                )
        ) ??
        [];

    const processSignaturePlaceholders =
        process?.items
            .filter(
                (
                    item
                ) =>
                    item.tipo ===
                    'assinatura' &&
                    item.obrigatorio
            )
            .map(
                (
                    item
                ) =>
                    item
                        .configuracao
                        .placeholder
            )
            .filter(
                (
                    value
                ): value is SignaturePlaceholder =>
                    typeof value ===
                    'string' &&
                    signaturePlaceholders.includes(
                        value as SignaturePlaceholder
                    )
            ) ??
        [];

    const missingSignatures =
        processSignaturePlaceholders.filter(
            (
                placeholder
            ) =>
                !signatures.includes(
                    placeholder
                )
        );

    const lockEntities =
        kind ===
        'prestacao_servico';

    async function createContract() {
        setError(
            null
        );

        if (
            !selectedTemplate
        ) {
            setError(
                'Selecione o template do contrato.'
            );

            return;
        }

        if (
            !process
        ) {
            setError(
                'Este template não possui checklist de processo associado. Configure-o em Templates antes de utilizar no aluguer.'
            );

            return;
        }

        if (
            signatures.length ===
            0
        ) {
            setError(
                'O template precisa possuir pelo menos uma assinatura obrigatória para que o contrato possa ficar assinado.'
            );

            return;
        }

        if (
            unsupportedItems.length >
            0
        ) {
            setError(
                'O checklist possui etapas automáticas ainda não ligadas ao sistema: ' +
                    unsupportedItems
                        .map(
                            (
                                item
                            ) =>
                                item
                                    .titulo
                        )
                        .join(
                            ', '
                        ) +
                    '.'
            );

            return;
        }

        if (
            missingSignatures.length >
            0
        ) {
            setError(
                'O checklist exige assinaturas que não existem no documento: ' +
                    missingSignatures.join(
                        ', '
                    ) +
                    '.'
            );

            return;
        }

        if (
            !motoristaId
        ) {
            setError(
                'Selecione o motorista.'
            );

            return;
        }

        if (
            !veiculoId
        ) {
            setError(
                'Selecione o veículo.'
            );

            return;
        }

        if (
            !dataInicio
        ) {
            setError(
                'Informe a data de início.'
            );

            return;
        }

        if (
            signatures.includes(
                'ASSINATURA_EMPRESA'
            ) &&
            !empresaId
        ) {
            setError(
                'Selecione a empresa responsável pela assinatura.'
            );

            return;
        }

        for (
            const placeholder of signatures
        ) {
            if (
                !signatureImages[
                    placeholder
                ]
            ) {
                setError(
                    `Preencha a assinatura ${placeholder}.`
                );

                return;
            }
        }

        if (
            signatures.includes(
                'ASSINATURA_TESTEMUNHA'
            ) &&
            !witnessName.trim()
        ) {
            setError(
                'Informe o nome da testemunha.'
            );

            return;
        }

        setSaving(
            true
        );

        try {
            const payload = {
                template_id:
                    selectedTemplate.id,

                tipo:
                    kind,

                empresa_id:
                    empresaId ||
                    null,

                motorista_id:
                    motoristaId,

                veiculo_id:
                    veiculoId,

                proprietario_id:
                    ownerId,

                data_inicio:
                    dataInicio,

                data_fim:
                    dataFim ||
                    null,

                valor_caucao:
                    selectedVehicle
                        ?.valor_caucao !==
                        null &&
                    selectedVehicle
                        ?.valor_caucao !==
                        undefined
                        ? Number(
                              selectedVehicle.valor_caucao
                          )
                        : null,

                assinaturas:
                    signatures.map(
                        (
                            placeholder
                        ) => ({
                            placeholder,
                            modo:
                                'presencial',

                            assinatura_url:
                                signatureImages[
                                    placeholder
                                ],

                            signatario_nome:
                                placeholder ===
                                'ASSINATURA_TESTEMUNHA'
                                    ? witnessName.trim()
                                    : undefined,

                            signatario_email:
                                placeholder ===
                                'ASSINATURA_TESTEMUNHA'
                                    ? witnessEmail
                                          .trim() ||
                                      undefined
                                    : undefined,
                        })
                    ),
            };

            const response =
                await api.post(
                    '/api/contratos',
                    payload
                );

            const contract =
                response.data
                    .data as Contrato;

            await onCreated(
                kind,
                contract,
                {
                    motoristaId,
                    veiculoId,
                    proprietarioId:
                        ownerId,
                    dataInicio,
                    dataFim:
                        dataFim ||
                        null,
                }
            );
        } catch (
            requestError
        ) {
            setError(
                apiError(
                    requestError,
                    'Não foi possível criar o contrato.'
                )
            );
        } finally {
            setSaving(
                false
            );
        }
    }

    return (
        <div className="max-w-5xl mx-auto">
            <div className="mb-6">
                <p className="text-sm text-indigo-600 font-medium">
                    {title}
                </p>

                <h3 className="mt-1 text-2xl font-bold text-slate-950">
                    Criar contrato
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                    Selecione o documento, confirme as entidades e recolha as assinaturas necessárias.
                </p>
            </div>

            {error && (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
                <FieldSelect
                    label="Template *"
                    value={
                        templateId
                    }
                    onChange={
                        setTemplateId
                    }
                >
                    <option value="">
                        Selecionar...
                    </option>

                    {sortedTemplates.map(
                        (
                            template
                        ) => (
                            <option
                                key={
                                    template.id
                                }
                                value={
                                    template.id
                                }
                            >
                                {
                                    template.nome
                                }
                                {template
                                    .perfil
                                    ?.nome
                                    ? ` · ${template.perfil.nome}`
                                    : ''}
                            </option>
                        )
                    )}
                </FieldSelect>

                <FieldSelect
                    label="Motorista *"
                    value={
                        motoristaId
                    }
                    disabled={
                        lockEntities
                    }
                    onChange={
                        setMotoristaId
                    }
                >
                    <option value="">
                        Selecionar...
                    </option>

                    {motoristas
                        .filter(
                            (
                                motorista
                            ) =>
                                motorista.ativo
                        )
                        .map(
                            (
                                motorista
                            ) => (
                                <option
                                    key={
                                        motorista.id
                                    }
                                    value={
                                        motorista.id
                                    }
                                >
                                    {
                                        motorista.nome_completo
                                    }
                                </option>
                            )
                        )}
                </FieldSelect>

                <FieldSelect
                    label="Veículo *"
                    value={
                        veiculoId
                    }
                    disabled={
                        lockEntities
                    }
                    onChange={
                        setVeiculoId
                    }
                >
                    <option value="">
                        Selecionar...
                    </option>

                    {veiculos
                        .filter(
                            (
                                vehicle
                            ) =>
                                vehicle.ativo
                        )
                        .map(
                            (
                                vehicle
                            ) => (
                                <option
                                    key={
                                        vehicle.id
                                    }
                                    value={
                                        vehicle.id
                                    }
                                >
                                    {
                                        vehicle.matricula
                                    }{' '}
                                    ·{' '}
                                    {
                                        vehicle.marca
                                    }{' '}
                                    {
                                        vehicle.modelo
                                    }
                                </option>
                            )
                        )}
                </FieldSelect>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Proprietário
                    </label>

                    <div className="h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center text-sm text-slate-600">
                        {selectedVehicle
                            ?.proprietario
                            ?.nome_empresa ??
                            selectedVehicle
                                ?.proprietario
                                ?.nome_completo ??
                            'Definido pelo veículo'}
                    </div>
                </div>

                <FieldInput
                    label="Data de início *"
                    type="date"
                    value={
                        dataInicio
                    }
                    disabled={
                        lockEntities
                    }
                    onChange={
                        setDataInicio
                    }
                />

                <FieldInput
                    label="Data de fim"
                    type="date"
                    value={
                        dataFim
                    }
                    disabled={
                        lockEntities
                    }
                    onChange={
                        setDataFim
                    }
                />
            </div>

            {selectedTemplate && (
                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h4 className="font-semibold text-slate-900">
                                Checklist associado
                            </h4>

                            <p className="mt-1 text-sm text-slate-500">
                                {process
                                    ? `${process.nome} · v${process.versao}`
                                    : 'Nenhum checklist de processo associado.'}
                            </p>
                        </div>

                        {process && (
                            <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                                {
                                    process.items
                                        .length
                                }{' '}
                                etapas
                            </span>
                        )}
                    </div>
                </div>
            )}

            {signatures.includes(
                'ASSINATURA_EMPRESA'
            ) && (
                <div className="mt-6">
                    <FieldSelect
                        label="Empresa signatária *"
                        value={
                            empresaId
                        }
                        onChange={
                            setEmpresaId
                        }
                    >
                        <option value="">
                            Selecionar...
                        </option>

                        {empresas.map(
                            (
                                company
                            ) => (
                                <option
                                    key={
                                        company.id
                                    }
                                    value={
                                        company.id
                                    }
                                >
                                    {
                                        company.nome_empresa
                                    }
                                </option>
                            )
                        )}
                    </FieldSelect>
                </div>
            )}

            {signatures.length >
                0 && (
                <div className="mt-8">
                    <h4 className="font-semibold text-slate-900">
                        Assinaturas presenciais
                    </h4>

                    <p className="mt-1 text-sm text-slate-500">
                        As assinaturas abaixo serão guardadas de forma privada e concluirão automaticamente as etapas correspondentes.
                    </p>

                    {signatures.includes(
                        'ASSINATURA_TESTEMUNHA'
                    ) && (
                        <div className="grid sm:grid-cols-2 gap-4 mt-5">
                            <FieldInput
                                label="Nome da testemunha *"
                                value={
                                    witnessName
                                }
                                onChange={
                                    setWitnessName
                                }
                            />

                            <FieldInput
                                label="E-mail da testemunha"
                                type="email"
                                value={
                                    witnessEmail
                                }
                                onChange={
                                    setWitnessEmail
                                }
                            />
                        </div>
                    )}

                    <div className="grid lg:grid-cols-2 gap-6 mt-5">
                        {signatures.map(
                            (
                                placeholder
                            ) => (
                                <SignaturePad
                                    key={
                                        placeholder
                                    }
                                    label={
                                        signatureLabel(
                                            placeholder
                                        )
                                    }
                                    onChange={(
                                        value
                                    ) =>
                                        setSignatureImages(
                                            (
                                                current
                                            ) => ({
                                                ...current,
                                                [placeholder]:
                                                    value,
                                            })
                                        )
                                    }
                                />
                            )
                        )}
                    </div>
                </div>
            )}

            <div className="mt-8 flex justify-end">
                <button
                    type="button"
                    disabled={
                        saving
                    }
                    onClick={
                        createContract
                    }
                    className="h-11 px-5 rounded-xl bg-indigo-600 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                >
                    {saving && (
                        <LoaderCircle className="w-4 h-4 animate-spin" />
                    )}

                    Criar contrato
                </button>
            </div>
        </div>
    );
}

function ContractProgress({
    contract,
    refreshing,
    onRefresh,
}: {
    contract: Contrato;
    refreshing: boolean;
    onRefresh: () => Promise<void>;
}) {
    const run =
        contract
            .checklist_process_run;

    const [
        completing,
        setCompleting,
    ] =
        useState<string | null>(
            null
        );

    const [
        error,
        setError,
    ] =
        useState<string | null>(
            null
        );

    async function complete(
        item: ChecklistProcessRunItem
    ) {
        setCompleting(
            item.id
        );

        setError(
            null
        );

        try {
            await api.patch(
                `/api/contratos/${contract.id}/checklist-processo/items/${item.id}/concluir`,
                {
                    resultado: {
                        concluido_manualmente:
                            true,
                    },
                }
            );

            await onRefresh();
        } catch (
            requestError
        ) {
            setError(
                apiError(
                    requestError
                )
            );
        } finally {
            setCompleting(
                null
            );
        }
    }

    return (
        <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 p-5 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                <div>
                    <div className="font-semibold text-slate-900">
                        {
                            contract
                                .template
                                ?.nome ??
                            'Contrato'
                        }
                    </div>

                    <div className="mt-1 text-sm text-slate-500">
                        Estado do contrato:{' '}
                        <strong>
                            {
                                contract.status
                            }
                        </strong>
                    </div>
                </div>

                <StatusPill
                    success={
                        contract.status ===
                        'assinado'
                    }
                    label={
                        contract.status ===
                        'assinado'
                            ? 'Assinado'
                            : contract.status ===
                              'enviado'
                            ? 'Aguardando assinatura'
                            : contract.status
                    }
                />
            </div>

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                </div>
            )}

            {!run ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                    Este contrato não possui execução de checklist de processo. O template precisa ter um checklist associado.
                </div>
            ) : (
                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                        <div>
                            <h4 className="font-semibold text-slate-900">
                                {
                                    run.template_nome_snapshot
                                }
                            </h4>

                            <p className="text-xs text-slate-400 mt-1">
                                Versão{' '}
                                {
                                    run.template_versao_snapshot
                                }
                            </p>
                        </div>

                        <StatusPill
                            success={
                                run.status ===
                                'concluido'
                            }
                            label={
                                run.status ===
                                'concluido'
                                    ? 'Concluído'
                                    : 'Em andamento'
                            }
                        />
                    </div>

                    <div className="divide-y divide-slate-100">
                        {run.items.map(
                            (
                                item
                            ) => {
                                const done =
                                    item.status ===
                                        'concluido' ||
                                    item.status ===
                                        'dispensado';

                                const automatic =
                                    automaticTypes.includes(
                                        item.tipo
                                    );

                                return (
                                    <div
                                        key={
                                            item.id
                                        }
                                        className="px-5 py-4 flex items-center gap-4"
                                    >
                                        <div
                                            className={[
                                                'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                                                done
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-slate-100 text-slate-400',
                                            ].join(
                                                ' '
                                            )}
                                        >
                                            {done ? (
                                                <Check className="w-4 h-4" />
                                            ) : (
                                                <Circle className="w-4 h-4" />
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-slate-800">
                                                {
                                                    item.titulo_snapshot
                                                }
                                            </div>

                                            <div className="mt-1 text-xs text-slate-400">
                                                {
                                                    item.tipo
                                                }
                                                {item.obrigatorio
                                                    ? ' · obrigatório'
                                                    : ' · opcional'}
                                            </div>
                                        </div>

                                        {!done &&
                                            automatic && (
                                                <span className="text-xs text-slate-400">
                                                    Automática
                                                </span>
                                            )}

                                        {!done &&
                                            !automatic && (
                                                <button
                                                    type="button"
                                                    disabled={
                                                        completing ===
                                                            item.id ||
                                                        refreshing
                                                    }
                                                    onClick={() =>
                                                        complete(
                                                            item
                                                        )
                                                    }
                                                    className="h-9 px-3 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold disabled:opacity-50"
                                                >
                                                    {completing ===
                                                    item.id
                                                        ? 'A concluir...'
                                                        : 'Concluir'}
                                                </button>
                                            )}
                                    </div>
                                );
                            }
                        )}
                    </div>
                </div>
            )}

            {contract.status !==
                'assinado' && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                    O contrato precisa estar assinado antes de avançar.
                </div>
            )}
        </div>
    );
}

function DeliveryStep({
    aluguer,
    draft,
    onOpen,
}: {
    aluguer: Aluguer;
    draft: ChecklistRecord | null;
    onOpen: (
        record: ChecklistRecord | null
    ) => void;
}) {
    if (
        aluguer
            .checklist_entrega_id
    ) {
        return (
            <div className="max-w-3xl mx-auto">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600" />

                    <h3 className="mt-4 text-xl font-semibold text-emerald-900">
                        Checklist de entrega finalizado
                    </h3>

                    <p className="mt-2 text-sm text-emerald-700">
                        O aluguer já possui o checklist físico obrigatório e pode avançar para o resumo.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto">
            <div className="mb-6">
                <p className="text-sm text-indigo-600 font-medium">
                    Checklist de Entrega
                </p>

                <h3 className="mt-1 text-2xl font-bold text-slate-950">
                    Estado inicial do veículo
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                    O motorista e o veículo ficam bloqueados conforme os contratos já criados.
                </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <ClipboardCheck className="w-10 h-10 text-indigo-600" />

                {draft ? (
                    <>
                        <h4 className="mt-4 font-semibold text-slate-900">
                            Existe um checklist em rascunho
                        </h4>

                        <p className="mt-2 text-sm text-slate-500">
                            Continue o preenchimento e finalize com as assinaturas da empresa e do motorista.
                        </p>

                        <button
                            type="button"
                            onClick={() =>
                                onOpen(
                                    draft
                                )
                            }
                            className="mt-5 h-11 px-5 rounded-xl bg-indigo-600 text-white text-sm font-semibold"
                        >
                            Continuar checklist
                        </button>
                    </>
                ) : (
                    <>
                        <h4 className="mt-4 font-semibold text-slate-900">
                            Criar checklist de entrega
                        </h4>

                        <p className="mt-2 text-sm text-slate-500">
                            Registe quilometragem, combustível, documentos, acessórios, danos e assinaturas.
                        </p>

                        <button
                            type="button"
                            onClick={() =>
                                onOpen(
                                    null
                                )
                            }
                            className="mt-5 h-11 px-5 rounded-xl bg-indigo-600 text-white text-sm font-semibold"
                        >
                            Iniciar checklist
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

function SummaryStep({
    aluguer,
    contratoAluguer,
    contratoPrestacao,
    error,
    activating,
    onActivate,
}: {
    aluguer: Aluguer;
    contratoAluguer: Contrato | null;
    contratoPrestacao: Contrato | null;
    error: string | null;
    activating: boolean;
    onActivate: () => Promise<void>;
}) {
    const ready =
        contractReady(
            contratoAluguer
        ) &&
        contractReady(
            contratoPrestacao
        ) &&
        Boolean(
            aluguer
                .checklist_entrega_id
        );

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-6">
                <p className="text-sm text-indigo-600 font-medium">
                    Resumo
                </p>

                <h3 className="mt-1 text-2xl font-bold text-slate-950">
                    Confirmar ativação
                </h3>
            </div>

            {error && (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
                <SummaryCard
                    title="Contrato de Aluguer"
                    complete={
                        contractReady(
                            contratoAluguer
                        )
                    }
                    text={
                        contratoAluguer
                            ? `Estado: ${contratoAluguer.status}`
                            : 'Não criado'
                    }
                />

                <SummaryCard
                    title="Contrato de Prestação"
                    complete={
                        contractReady(
                            contratoPrestacao
                        )
                    }
                    text={
                        contratoPrestacao
                            ? `Estado: ${contratoPrestacao.status}`
                            : 'Não criado'
                    }
                />

                <SummaryCard
                    title="Checklist de Entrega"
                    complete={
                        Boolean(
                            aluguer
                                .checklist_entrega_id
                        )
                    }
                    text={
                        aluguer
                            .checklist_entrega_id
                            ? 'Finalizado'
                            : 'Pendente'
                    }
                />

                <SummaryCard
                    title="Veículo"
                    complete={
                        Boolean(
                            aluguer
                                .veiculo_id
                        )
                    }
                    text={
                        aluguer
                            .veiculo
                            ? `${aluguer.veiculo.matricula} · ${aluguer.veiculo.marca} ${aluguer.veiculo.modelo}`
                            : 'Não selecionado'
                    }
                />
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 p-5">
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                    <Info
                        label="Motorista"
                        value={
                            aluguer
                                .motorista
                                ?.nome_completo ??
                            '—'
                        }
                    />

                    <Info
                        label="Período"
                        value={`${dateLabel(
                            aluguer.data_inicio
                        )} → ${dateLabel(
                            aluguer.data_fim
                        )}`}
                    />
                </div>
            </div>

            <div className="mt-8 flex justify-end">
                <button
                    type="button"
                    disabled={
                        !ready ||
                        activating
                    }
                    onClick={
                        onActivate
                    }
                    className="h-12 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-40"
                >
                    {activating ? (
                        <LoaderCircle className="w-5 h-5 animate-spin" />
                    ) : (
                        <CheckCircle2 className="w-5 h-5" />
                    )}

                    Ativar aluguer
                </button>
            </div>
        </div>
    );
}

function SummaryCard({
    title,
    complete,
    text,
}: {
    title: string;
    complete: boolean;
    text: string;
}) {
    return (
        <div
            className={[
                'rounded-2xl border p-5',
                complete
                    ? 'border-emerald-200 bg-emerald-50'
                    : 'border-slate-200 bg-white',
            ].join(
                ' '
            )}
        >
            <div className="flex items-center gap-3">
                {complete ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                    <Circle className="w-5 h-5 text-slate-300" />
                )}

                <div>
                    <div className="font-semibold text-sm text-slate-900">
                        {title}
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                        {text}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatusPill({
    success,
    label,
}: {
    success: boolean;
    label: string;
}) {
    return (
        <span
            className={[
                'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
                success
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-amber-50 text-amber-700',
            ].join(
                ' '
            )}
        >
            {label}
        </span>
    );
}

function StepTab({
    number,
    label,
    active,
    complete,
    disabled = false,
    onClick,
}: {
    number: number;
    label: string;
    active: boolean;
    complete: boolean;
    disabled?: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            disabled={
                disabled
            }
            onClick={
                onClick
            }
            className={[
                'py-4 px-2 sm:px-4 border-b-2 flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold transition disabled:opacity-30',
                active
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-slate-500',
            ].join(
                ' '
            )}
        >
            <span
                className={[
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs',
                    complete
                        ? 'bg-emerald-100 text-emerald-700'
                        : active
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-slate-100 text-slate-500',
                ].join(
                    ' '
                )}
            >
                {complete ? (
                    <Check className="w-3.5 h-3.5" />
                ) : (
                    number
                )}
            </span>

            <span className="hidden md:inline">
                {label}
            </span>
        </button>
    );
}

function Overlay({
    children,
}: {
    children:
        ReactNode;
}) {
    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-5">
            <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" />
            <div className="relative w-full flex justify-center">
                {children}
            </div>
        </div>
    );
}

function FieldSelect({
    label,
    value,
    disabled = false,
    onChange,
    children,
}: {
    label: string;
    value: string;
    disabled?: boolean;
    onChange: (
        value: string
    ) => void;
    children:
        ReactNode;
}) {
    return (
        <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {label}
            </label>

            <select
                value={
                    value
                }
                disabled={
                    disabled
                }
                onChange={(
                    event
                ) =>
                    onChange(
                        event
                            .target
                            .value
                    )
                }
                className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:bg-slate-100"
            >
                {children}
            </select>
        </div>
    );
}

function FieldInput({
    label,
    value,
    type = 'text',
    disabled = false,
    onChange,
}: {
    label: string;
    value: string;
    type?: string;
    disabled?: boolean;
    onChange: (
        value: string
    ) => void;
}) {
    return (
        <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {label}
            </label>

            <input
                type={
                    type
                }
                value={
                    value
                }
                disabled={
                    disabled
                }
                onChange={(
                    event
                ) =>
                    onChange(
                        event
                            .target
                            .value
                    )
                }
                className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:bg-slate-100"
            />
        </div>
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
        <div>
            <div className="text-xs uppercase tracking-wider text-slate-400">
                {label}
            </div>

            <div className="mt-1 text-sm font-medium text-slate-800">
                {value}
            </div>
        </div>
    );
}

function signatureLabel(
    placeholder:
        SignaturePlaceholder
): string {
    return {
        ASSINATURA_MOTORISTA:
            'Assinatura do motorista',
        ASSINATURA_PROPRIETARIO:
            'Assinatura do proprietário',
        ASSINATURA_EMPRESA:
            'Assinatura da empresa',
        ASSINATURA_TESTEMUNHA:
            'Assinatura da testemunha',
    }[placeholder];
}

function dateLabel(
    value:
        | string
        | null
): string {
    if (!value) {
        return '—';
    }

    return new Intl.DateTimeFormat(
        'pt-PT'
    ).format(
        new Date(
            `${value.slice(
                0,
                10
            )}T12:00:00`
        )
    );
}
