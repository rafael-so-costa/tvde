import axios from "axios";
import {
    useEffect,
    useMemo,
    useState,
} from "react";
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    Check,
    LoaderCircle,
    X,
} from "lucide-react";
import api from "../../../lib/api";
import ContratoDocumentPreview from "../ContratoDocumentPreview";
import { useContractTypes } from "../../../hooks/useContractTypes";
import type {
    Contrato,
} from "../../../types/contrato";
import type {
    Empresa,
} from "../../../types/empresa";
import type {
    Motorista,
} from "../../../types/motorista";
import type {
    Proprietario,
} from "../../../types/proprietario";
import type {
    SignaturePlaceholder,
} from "../../../types/template";
import type {
    ContractWizardForm,
    ContractWizardSignatures,
    TipoContrato,
} from "../../../types/tipo-contrato";
import type {
    Veiculo,
} from "../../../types/veiculo";
import ContractIdentificationStep from "./ContractIdentificationStep";
import {validateBillingFields} from "./ContractBillingFields";
import ContractReviewStep from "./ContractReviewStep";
import ContractSignatureStep from "./ContractSignatureStep";
import ContractTemplateStep from "./ContractTemplateStep";
import ContractWorkflowProgress from "./ContractWorkflowProgress";

interface Props {
    open: boolean;

    empresas: Empresa[];
    proprietarios: Proprietario[];
    motoristas: Motorista[];
    veiculos: Veiculo[];

    onClose: () => void;

    onSuccess: (
        contract: Contrato,
    ) => Promise<void> | void;

    initialTypeId?:
        string | null;

    initialValues?:
        Partial<ContractWizardForm>;
}

const steps = [
    "Tipo",
    "Dados",
    "Assinaturas",
    "Revisão",
];

const initialForm: ContractWizardForm = {
    tipo_contrato_id: "",

    empresa_id: "",
    proprietario_id: "",
    motorista_id: "",
    veiculo_id: "",

    data_inicio: "",
    data_fim: "",

    valor_diaria: "",
    valor_caucao: "",
    valor_total: "",

    campos_preenchidos: {},
};

export default function ContractWizard({
    open,
    empresas,
    proprietarios,
    motoristas,
    veiculos,
    onClose,
    onSuccess,
    initialTypeId = null,
    initialValues = {},
}: Props) {
    const typesQuery =
        useContractTypes({
            enabled: open,
            menuOnly:
                !initialTypeId,
        });

    const [step, setStep] =
        useState(0);

    const [form, setForm] =
        useState<ContractWizardForm>(
            initialForm,
        );

    const [signatures, setSignatures] =
        useState<ContractWizardSignatures>(
            {},
        );

    const [error, setError] =
        useState<string | null>(null);

    const [saving, setSaving] =
        useState(false);

    const [previewOpen,setPreviewOpen] =
        useState(false);

    const types =
        typesQuery.data ?? [];

    const selectedType =
        useMemo(
            () =>
                types.find(
                    (type) =>
                        type.id ===
                        form.tipo_contrato_id,
                ) ?? null,
            [
                types,
                form.tipo_contrato_id,
            ],
        );

    const empresa =
        empresas.find(
            (item) =>
                item.id ===
                form.empresa_id,
        );

    const proprietario =
        proprietarios.find(
            (item) =>
                item.id ===
                form.proprietario_id,
        );

    const motorista =
        motoristas.find(
            (item) =>
                item.id ===
                form.motorista_id,
        );

    const veiculo =
        veiculos.find(
            (item) =>
                item.id ===
                form.veiculo_id,
        );

    useEffect(() => {
        if (!open) {
            return;
        }

        setStep(0);
        setForm(initialForm);
        setSignatures({});
        setError(null);
        setSaving(false);
        setPreviewOpen(false);
    }, [open]);

    useEffect(() => {
        if (
            !open ||
            !initialTypeId ||
            form.tipo_contrato_id ||
            types.length === 0
        ) {
            return;
        }

        chooseType(
            initialTypeId,
            initialValues,
        );

        setStep(1);
    }, [
        open,
        initialTypeId,
        types,
        form.tipo_contrato_id,
    ]);

    if (!open) {
        return null;
    }

    function chooseType(
        id: string,
        preset:
            Partial<ContractWizardForm> =
            {},
    ) {
        const type =
            types.find(
                (item) =>
                    item.id === id,
            );

        if (!type) {
            return;
        }

        const nextSignatures:
            ContractWizardSignatures =
            {};

        for (
            const config of
            type.assinaturas_configuracao
        ) {
            const mode =
                config.modos.includes(
                    "presencial",
                )
                    ? "presencial"
                    : config.modos[0];

            nextSignatures[
                config.placeholder
            ] = {
                enabled:
                    config.obrigatoria,

                modo: mode,

                assinatura_url: "",
                signatario_nome: "",
                signatario_email: "",
            };
        }

        const requiresCompany =
            Boolean(
                type.entidades.empresa,
            ) ||
            type.assinaturas_configuracao.some(
                (item) =>
                    item.placeholder ===
                    "ASSINATURA_EMPRESA",
            );

        const defaultCompany =
            requiresCompany
                ? empresas.find(
                      (item) =>
                          item.ativo,
                  )?.id ??
                  empresas[0]?.id ??
                  ""
                : "";

        setForm({
            ...initialForm,
            ...preset,

            tipo_contrato_id:
                type.id,

            empresa_id:
                preset.empresa_id ??
                defaultCompany,

            campos_preenchidos:
                preset.campos_preenchidos ??
                {},
        });

        setSignatures(
            nextSignatures,
        );

        setError(null);
    }

    function setField(
        field: keyof Omit<
            ContractWizardForm,
            "campos_preenchidos"
        >,
        value: string,
    ) {
        setForm((current) => ({
            ...current,
            [field]: value,
        }));
    }

    function setCustomField(
        key: string,
        value:
            | string
            | number
            | boolean
            | null,
    ) {
        setForm((current) => ({
            ...current,

            campos_preenchidos: {
                ...current.campos_preenchidos,
                [key]: value,
            },
        }));
    }

    function setVehicle(
        id: string,
    ) {
        const vehicle =
            veiculos.find(
                (item) =>
                    item.id === id,
            );

        setForm((current) => ({
            ...current,

            veiculo_id: id,

            proprietario_id:
                vehicle?.proprietario_id ??
                current.proprietario_id,

            valor_caucao:
                !current.valor_caucao &&
                vehicle?.valor_caucao
                    ? String(
                          vehicle.valor_caucao,
                      )
                    : current.valor_caucao,
        }));
    }

    function setSignature(
        placeholder: SignaturePlaceholder,
        values: Partial<
            NonNullable<
                ContractWizardSignatures[
                    SignaturePlaceholder
                ]
            >
        >,
    ) {
        setSignatures((current) => {
            const existing =
                current[placeholder];

            if (!existing) {
                return current;
            }

            return {
                ...current,

                [placeholder]: {
                    ...existing,
                    ...values,
                },
            };
        });
    }

    function validateStep():
        | string
        | null {
        if (step === 0) {
            if (!selectedType) {
                return "Selecione um tipo de contrato.";
            }

            return null;
        }

        if (!selectedType) {
            return "Selecione um tipo de contrato.";
        }

        if (step === 1) {
            return validateIdentification(
                selectedType,
                form,
            );
        }

        if (step === 2) {
            return validateSignatures(
                selectedType,
                signatures,
                empresa,
                motorista,
                proprietario,
            );
        }

        return null;
    }

    function next() {
        const message =
            validateStep();

        if (message) {
            setError(message);
            return;
        }

        setError(null);

        setStep((current) =>
            Math.min(
                current + 1,
                steps.length - 1,
            ),
        );
    }

    function back() {
        setError(null);

        setStep((current) =>
            Math.max(
                current - 1,
                0,
            ),
        );
    }

    async function submit() {
        if (!selectedType) {
            return;
        }

        const identification=validateIdentification(selectedType,form);

        if(identification){
            setError(identification);
            setStep(1);
            return;
        }

        const validation =
            validateSignatures(
                selectedType,
                signatures,
                empresa,
                motorista,
                proprietario,
            );

        if (validation) {
            setError(validation);
            setStep(2);
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const response =
                await api.post(
                    "/api/contratos",
                    {
                        tipo_contrato_id:
                            selectedType.id,

                        empresa_id:
                            form.empresa_id ||
                            null,

                        proprietario_id:
                            form.proprietario_id ||
                            null,

                        motorista_id:
                            form.motorista_id ||
                            null,

                        veiculo_id:
                            form.veiculo_id ||
                            null,

                        data_inicio:
                            form.data_inicio ||
                            null,

                        data_fim:
                            form.data_fim ||
                            null,

                        valor_diaria:
                            numeric(
                                form.valor_diaria,
                            ),

                        valor_caucao:
                            numeric(
                                form.valor_caucao,
                            ),

                        valor_total:
                            numeric(
                                form.valor_total,
                            ),

                        campos_preenchidos:
                            form.campos_preenchidos,

                        assinaturas:
                            buildSignatures(
                                signatures,
                            ),
                    },
                );

            const contract =
                response.data
                    .data as Contrato;

            await onSuccess(
                contract,
            );

            onClose();
        } catch (requestError) {
            setError(
                apiError(
                    requestError,
                ),
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-5">
            <button
                type="button"
                aria-label="Fechar"
                onClick={onClose}
                className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm"
            />

            {previewOpen && selectedType?.template_id && (
                <ContratoDocumentPreview
                    title={`Pré-visualização — ${selectedType.nome}`}
                    onClose={()=>setPreviewOpen(false)}
                    payload={{
                        tipo_contrato_id:selectedType.id,
                        empresa_id:form.empresa_id || null,
                        proprietario_id:form.proprietario_id || null,
                        motorista_id:form.motorista_id || null,
                        veiculo_id:form.veiculo_id || null,
                        data_inicio:form.data_inicio || null,
                        data_fim:form.data_fim || null,
                        valor_diaria:numeric(form.valor_diaria),
                        valor_caucao:numeric(form.valor_caucao),
                        valor_total:numeric(form.valor_total),
                        campos_preenchidos:form.campos_preenchidos,
                    }}
                />
            )}
            <div className="relative flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                <header className="border-b border-slate-200 px-5 py-5 sm:px-7">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                                Novo contrato
                            </p>

                            <h2 className="mt-1 text-xl font-bold text-slate-950">
                                {selectedType?.nome ??
                                    "Criar contrato"}
                            </h2>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="mt-5">
                        <ContractWorkflowProgress
                            current={step}
                            steps={steps}
                        />
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-5 sm:p-7">
                    {error && (
                        <div className="mb-6 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                            <AlertCircle className="h-5 w-5 shrink-0" />
                            {error}
                        </div>
                    )}

                    {step === 0 && (
                        <ContractTemplateStep
                            types={types}
                            selectedId={
                                form.tipo_contrato_id
                            }
                            loading={
                                typesQuery.isLoading
                            }
                            onSelect={
                                chooseType
                            }
                        />
                    )}

                    {step === 1 &&
                        selectedType && (
                            <ContractIdentificationStep
                                type={
                                    selectedType
                                }
                                form={form}
                                empresas={
                                    empresas
                                }
                                proprietarios={
                                    proprietarios
                                }
                                motoristas={
                                    motoristas
                                }
                                veiculos={
                                    veiculos
                                }
                                onField={
                                    setField
                                }
                                onCustomField={
                                    setCustomField
                                }
                                onVehicle={
                                    setVehicle
                                }
                            />
                        )}

                    {step === 2 &&
                        selectedType && (
                            <ContractSignatureStep
                                type={
                                    selectedType
                                }
                                signatures={
                                    signatures
                                }
                                empresa={
                                    empresa
                                }
                                motorista={
                                    motorista
                                }
                                proprietario={
                                    proprietario
                                }
                                onChange={
                                    setSignature
                                }
                            />
                        )}

                    {step === 3 &&
                        selectedType && (
                            <ContractReviewStep
                                type={
                                    selectedType
                                }
                                form={form}
                                signatures={
                                    signatures
                                }
                                empresa={
                                    empresa
                                }
                                motorista={
                                    motorista
                                }
                                proprietario={
                                    proprietario
                                }
                                veiculo={
                                    veiculo
                                }
                            />
                        )}
                </div>

                <footer className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-7">
                    <button
                        type="button"
                        onClick={
                            step === 0
                                ? onClose
                                : back
                        }
                        disabled={saving}
                        className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 disabled:opacity-50"
                    >
                        {step > 0 && (
                            <ArrowLeft className="h-4 w-4" />
                        )}

                        {step === 0
                            ? "Cancelar"
                            : "Voltar"}
                    </button>

                    {step === steps.length-1 && selectedType && (
                        <button
                            type="button"
                            onClick={()=>{
                                if(!selectedType.template_id){
                                    setError(
                                        "Este tipo de contrato não possui um modelo documental associado. Configure um template válido antes de pré-visualizar o PDF."
                                    );
                                    return;
                                }
                                setError(null);
                                setPreviewOpen(true);
                            }}
                            disabled={saving}
                            className="inline-flex h-11 items-center rounded-xl border border-indigo-200 bg-indigo-50 px-4 text-sm font-semibold text-indigo-700 disabled:opacity-50"
                        >
                            Pré-visualizar documento
                        </button>
                    )}

                    {step <
                    steps.length - 1 ? (
                        <button
                            type="button"
                            onClick={next}
                            disabled={
                                saving ||
                                typesQuery.isLoading
                            }
                            className="inline-flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white disabled:opacity-50"
                        >
                            Continuar

                            <ArrowRight className="h-4 w-4" />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={submit}
                            disabled={saving}
                            className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white disabled:opacity-50"
                        >
                            {saving ? (
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                            ) : (
                                <Check className="h-4 w-4" />
                            )}

                            Criar contrato
                        </button>
                    )}
                </footer>
            </div>
        </div>
    );
}

function validateIdentification(
    type: TipoContrato,
    form: ContractWizardForm,
): string | null {
    const signatures =
        type.assinaturas_configuracao;

    const requires = (
        placeholder: SignaturePlaceholder,
    ) =>
        signatures.some(
            (item) =>
                item.placeholder ===
                placeholder,
        );

    if (
        type.entidades.empresa &&
        !form.empresa_id
    ) {
        return "Selecione a empresa.";
    }

    if (
        (type.entidades.motorista ||
            requires(
                "ASSINATURA_MOTORISTA",
            )) &&
        !form.motorista_id
    ) {
        return "Selecione o motorista.";
    }

    if (
        (type.entidades.proprietario ||
            requires(
                "ASSINATURA_PROPRIETARIO",
            )) &&
        !form.proprietario_id
    ) {
        return "Selecione o proprietário.";
    }

    if (
        type.entidades.veiculo &&
        !form.veiculo_id
    ) {
        return "Selecione o veículo.";
    }

    if (
        requires(
            "ASSINATURA_EMPRESA",
        ) &&
        !form.empresa_id
    ) {
        return "Selecione a empresa signatária.";
    }

    const requiresDateRange = [
        "contrato_de_prestacao_de_servicos",
        "aluguer_tvde_pessoa_singular",
        "aluguer_tvde_pessoa_coletiva",
    ].includes(type.codigo);

    if(requiresDateRange && !form.data_inicio){
        return "Informe a data de início do contrato.";
    }

    if(requiresDateRange && !form.data_fim){
        return "Informe a data de fim do contrato.";
    }

    if(
        requiresDateRange &&
        form.data_inicio &&
        form.data_fim &&
        form.data_inicio === form.data_fim
    ){
        return "A duração do contrato deve ser superior a zero dias.";
    }
    if (
        form.data_inicio &&
        form.data_fim &&
        form.data_fim <
            form.data_inicio
    ) {
        return "A data de fim não pode ser anterior à data de início.";
    }

    const topLevel:
        Record<string, string> = {
        DATA_INICIO:
            form.data_inicio,
        DATA_FIM:
            form.data_fim,
        VALOR_DIARIA:
            form.valor_diaria,
        VALOR_CAUCAO:
            form.valor_caucao,
        VALOR_TOTAL:
            form.valor_total,
    };

    for (
        const field of
        type.campos_configuracao
    ) {
        if (
            field.origem !==
                "manual" ||
            !field.obrigatorio
        ) {
            continue;
        }

        const key =
            field.campo
                .trim()
                .toUpperCase();

        const value =
            topLevel[key] ??
            form.campos_preenchidos[
                field.campo
            ];

        if(
            type.cobranca_habilitada &&
            key==="PERCENTAGEM_CONTRATO"
        ){
            continue;
        }

        if (
            value === null ||
            value === undefined ||
            String(value).trim() === ""
        ) {
            return `Preencha o campo ${field.campo}.`;
        }
    }

    if(type.cobranca_habilitada){
        return validateBillingFields(form.campos_preenchidos);
    }

    return null;
}

function validateSignatures(
    type: TipoContrato,
    signatures: ContractWizardSignatures,
    empresa?: Empresa,
    motorista?: Motorista,
    proprietario?: Proprietario,
): string | null {
    for (
        const config of
        type.assinaturas_configuracao
    ) {
        const state =
            signatures[
                config.placeholder
            ];

        if (!state) {
            if (config.obrigatoria) {
                return "Existe uma assinatura obrigatória sem configuração.";
            }

            continue;
        }

        if (
            !config.obrigatoria &&
            !state.enabled
        ) {
            continue;
        }

        if (
            state.modo ===
                "presencial" &&
            !state.assinatura_url
        ) {
            return `Preencha a assinatura ${config.placeholder}.`;
        }

        if (
            config.placeholder ===
                "ASSINATURA_TESTEMUNHA" &&
            !state.signatario_nome.trim()
        ) {
            return "Informe o nome da testemunha.";
        }

        if (
            state.modo !== "remota"
        ) {
            continue;
        }

        const email =
            config.placeholder ===
            "ASSINATURA_EMPRESA"
                ? empresa?.email
                : config.placeholder ===
                    "ASSINATURA_MOTORISTA"
                  ? motorista?.email
                  : config.placeholder ===
                      "ASSINATURA_PROPRIETARIO"
                    ? proprietario?.email
                    : state.signatario_email;

        if (!email?.trim()) {
            return `O signatário de ${config.placeholder} precisa de um e-mail válido.`;
        }
    }

    return null;
}

function buildSignatures(
    signatures: ContractWizardSignatures,
) {
    return Object.entries(
        signatures,
    )
        .filter(
            ([, state]) =>
                state.enabled,
        )
        .map(
            ([
                placeholder,
                state,
            ]) => ({
                placeholder,

                modo:
                    state.modo,

                assinatura_url:
                    state.modo ===
                    "presencial"
                        ? state.assinatura_url
                        : undefined,

                signatario_nome:
                    placeholder ===
                    "ASSINATURA_TESTEMUNHA"
                        ? state.signatario_nome.trim()
                        : undefined,

                signatario_email:
                    placeholder ===
                        "ASSINATURA_TESTEMUNHA" &&
                    state.modo ===
                        "remota"
                        ? state.signatario_email.trim()
                        : undefined,
            }),
        );
}

function numeric(
    value: string,
): number | null {
    const normalized =
        value.trim();

    return normalized
        ? Number(normalized)
        : null;
}

function apiError(
    error: unknown,
): string {
    if (
        axios.isAxiosError(error)
    ) {
        const errors =
            error.response?.data
                ?.errors;

        if (
            errors &&
            typeof errors ===
                "object"
        ) {
            const message =
                Object.values(errors)
                    .flat()
                    .find(
                        (value) =>
                            typeof value ===
                            "string",
                    );

            if (
                typeof message ===
                "string"
            ) {
                return message;
            }
        }

        return (
            error.response?.data
                ?.message ??
            "Não foi possível criar o contrato."
        );
    }

    return "Não foi possível criar o contrato.";
}
