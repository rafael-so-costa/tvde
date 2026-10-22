import axios from "axios";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { AlertCircle, FileSignature, LoaderCircle, X } from "lucide-react";
import api from "../../lib/api";
import ContratoDocumentPreview from "./ContratoDocumentPreview";
import ContractBillingFields, {
    validateBillingFields,
} from "./wizard/ContractBillingFields";
import type { ContractWizardForm } from "../../types/tipo-contrato";
import SignaturePad from "../checklists/SignaturePad";
import type { Contrato, ContratoTipo } from "../../types/contrato";
import type { Empresa } from "../../types/empresa";
import type { Motorista } from "../../types/motorista";
import type { Proprietario } from "../../types/proprietario";
import type {
    SignaturePlaceholder,
    TemplateContrato,
    TemplateField,
} from "../../types/template";
import type { Veiculo } from "../../types/veiculo";

type NumericField = "valor_diaria" | "valor_caucao" | "valor_total";
type SignatureMode = "presencial" | "remota";

interface FormState {
    template_id: string;
    tipo: ContratoTipo;
    empresa_id: string;
    proprietario_id: string;
    motorista_id: string;
    veiculo_id: string;
    data_inicio: string;
    data_fim: string;
    valor_diaria: string;
    valor_caucao: string;
    valor_total: string;
}

export interface ContractFormInitialValues {
    tipo?: ContratoTipo;
    motorista_id?: string | null;
    veiculo_id?: string | null;
    proprietario_id?: string | null;
    data_inicio?: string | null;
    data_fim?: string | null;
}

export interface ContractFormLocks {
    tipo?: boolean;
    motorista?: boolean;
    veiculo?: boolean;
    proprietario?: boolean;
    datas?: boolean;
}

interface Props {
    open: boolean;
    contract?: Contrato | null;
    templates: TemplateContrato[];
    motoristas: Motorista[];
    veiculos: Veiculo[];
    proprietarios: Proprietario[];
    empresas: Empresa[];
    initialValues?: ContractFormInitialValues;
    locks?: ContractFormLocks;
    onClose: () => void;
    onSuccess: (contract: Contrato) => Promise<void>;
}

const signaturePlaceholders: SignaturePlaceholder[] = [
    "ASSINATURA_MOTORISTA",
    "ASSINATURA_PROPRIETARIO",
    "ASSINATURA_EMPRESA",
    "ASSINATURA_TESTEMUNHA",
];

function apiError(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const errors = error.response?.data?.errors;

        if (errors && typeof errors === "object") {
            const first = Object.values(errors)
                .flat()
                .find((value) => typeof value === "string");

            if (typeof first === "string") return first;
        }

        return error.response?.data?.message ?? "Não foi possível concluir a operação.";
    }

    return "Não foi possível concluir a operação.";
}

function normalizePlaceholder(value: string): string {
    let normalized = value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "_");

    normalized = `_${normalized}_`
        .replace(/_(DA|DO|DE|DAS|DOS)_/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "");

    return normalized;
}

function requiredSignatures(template: TemplateContrato | null): SignaturePlaceholder[] {
    if (!template) return [];

    const tokens = new Set<string>();
    const content = template.conteudo_original ?? "";
    const patterns = [
        /\{\{\s*([^{}]+?)\s*\}\}/g,
        /\[\[\s*([^[\]]+?)\s*\]\]/g,
        /<<\s*([^<>]+?)\s*>>/g,
        /__([A-Z0-9_\sÀ-ÿ]+)__/g,
        /\(([A-Z0-9_\sÀ-ÿ]{2,})\)/g,
    ];

    for (const pattern of patterns) {
        for (const match of content.matchAll(pattern)) {
            if (match[1]) tokens.add(normalizePlaceholder(match[1]));
        }
    }

    for (const field of template.campos_detectados ?? []) {
        if (field.name) tokens.add(normalizePlaceholder(field.name));
        if (field.placeholder) tokens.add(normalizePlaceholder(field.placeholder));
    }

    return signaturePlaceholders.filter((placeholder) => tokens.has(placeholder));
}

function fieldKey(field: TemplateField): string {
    return field.name || field.placeholder || field.id;
}

function isSignatureField(field: TemplateField): boolean {
    const values = [field.name, field.placeholder].filter(
        (value): value is string => Boolean(value),
    );

    return values.some((value) =>
        signaturePlaceholders.includes(
            normalizePlaceholder(value) as SignaturePlaceholder,
        ),
    );
}

function htmlInputType(field: TemplateField): string {
    const type = field.type?.toLowerCase() ?? "text";
    return ["date", "email", "number", "tel"].includes(type) ? type : "text";
}

function signatureLabel(placeholder: SignaturePlaceholder): string {
    return {
        ASSINATURA_MOTORISTA: "Assinatura do motorista",
        ASSINATURA_PROPRIETARIO: "Assinatura do proprietário",
        ASSINATURA_EMPRESA: "Assinatura da empresa",
        ASSINATURA_TESTEMUNHA: "Assinatura da testemunha",
    }[placeholder];
}

export default function ContratoFormModal({
    open,
    contract = null,
    templates,
    motoristas,
    veiculos,
    proprietarios,
    empresas,
    initialValues,
    locks = {},
    onClose,
    onSuccess,
}: Props) {
    const editing = Boolean(contract);
    const [form, setForm] = useState<FormState>({
        template_id: "",
        tipo: "aluguer",
        empresa_id: "",
        proprietario_id: "",
        motorista_id: "",
        veiculo_id: "",
        data_inicio: "",
        data_fim: "",
        valor_diaria: "",
        valor_caucao: "",
        valor_total: "",
    });
    const [campos, setCampos] = useState<Record<string, unknown>>({});
    const [signatures, setSignatures] = useState<
        Partial<Record<SignaturePlaceholder, string>>
    >({});
    const [signatureModes, setSignatureModes] = useState<
        Partial<Record<SignaturePlaceholder, SignatureMode>>
    >({});
    const [witnessName, setWitnessName] = useState("");
    const [witnessEmail, setWitnessEmail] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [previewOpen,setPreviewOpen] = useState(false);

    const selectedTemplate = useMemo(
        () => templates.find((template) => template.id === form.template_id) ?? null,
        [templates, form.template_id],
    );

    const selectedVehicle = useMemo(
        () => veiculos.find((vehicle) => vehicle.id === form.veiculo_id) ?? null,
        [veiculos, form.veiculo_id],
    );

    const effectiveTemplate =
        selectedTemplate ?? (editing ? contract?.template ?? null : null);

    const financialTemplate=Boolean(
        effectiveTemplate?.conteudo_original?.includes("{{CONDICOES_COBRANCA}}") &&
        effectiveTemplate?.conteudo_original?.includes("{{PERIODICIDADE_PAGAMENTO_TEXTO}}")
    );

    const visibleFields = useMemo(
        () =>
            (effectiveTemplate?.campos_detectados ?? []).filter(
                (field) => {
                    if(isSignatureField(field)) return false;

                    if(financialTemplate){
                        const key=normalizePlaceholder(fieldKey(field));

                        if(
                            key==="CONDICOES_COBRANCA" ||
                            key==="PERIODICIDADE_PAGAMENTO_TEXTO"
                        ){
                            return false;
                        }
                    }

                    return true;
                },
            ),
        [effectiveTemplate,financialTemplate],
    );

    const required = useMemo(
        () => requiredSignatures(selectedTemplate),
        [selectedTemplate],
    );

    const processSignaturePlaceholders = useMemo(
        () =>
            selectedTemplate?.checklist_process_template?.items
                .filter((item) => item.tipo === "assinatura" && item.obrigatorio)
                .map((item) => item.configuracao.placeholder)
                .filter(
                    (value): value is SignaturePlaceholder =>
                        typeof value === "string" &&
                        signaturePlaceholders.includes(value as SignaturePlaceholder),
                ) ?? [],
        [selectedTemplate],
    );

    const mismatchedProcessSignatures = useMemo(
        () =>
            processSignaturePlaceholders.filter(
                (placeholder) => !required.includes(placeholder),
            ),
        [processSignaturePlaceholders, required],
    );

    useEffect(() => {
        if (!open) return;

        setError(null);
        setSaving(false);
        setPreviewOpen(false);
        setSignatures({});
        setSignatureModes({});
        setWitnessName("");
        setWitnessEmail("");

        if (contract) {
            setForm({
                template_id: contract.template_id ?? "",
                tipo: contract.tipo,
                empresa_id: "",
                proprietario_id: contract.proprietario_id ?? "",
                motorista_id: contract.motorista_id ?? "",
                veiculo_id: contract.veiculo_id ?? "",
                data_inicio: contract.data_inicio?.slice(0, 10) ?? "",
                data_fim: contract.data_fim?.slice(0, 10) ?? "",
                valor_diaria:
                    contract.valor_diaria !== null ? String(contract.valor_diaria) : "",
                valor_caucao:
                    contract.valor_caucao !== null ? String(contract.valor_caucao) : "",
                valor_total:
                    contract.valor_total !== null ? String(contract.valor_total) : "",
            });
            setCampos(contract.campos_preenchidos ?? {});
            return;
        }

        setForm({
            template_id: "",
            tipo: initialValues?.tipo ?? "aluguer",
            empresa_id:
                empresas.find((company) => company.ativo)?.id ??
                empresas[0]?.id ??
                "",
            proprietario_id: initialValues?.proprietario_id ?? "",
            motorista_id: initialValues?.motorista_id ?? "",
            veiculo_id: initialValues?.veiculo_id ?? "",
            data_inicio: initialValues?.data_inicio?.slice(0, 10) ?? "",
            data_fim: initialValues?.data_fim?.slice(0, 10) ?? "",
            valor_diaria: "",
            valor_caucao: "",
            valor_total: "",
        });
        setCampos({});
    }, [open, contract, initialValues, empresas]);

    useEffect(() => {
        if (!open || editing) return;

        setCampos((current) => {
            const next = { ...current };

            for (const field of visibleFields) {
                const key = fieldKey(field);
                if (next[key] === undefined) next[key] = field.value ?? "";
            }

            return next;
        });
    }, [open, editing, visibleFields]);

    if (!open) return null;

    function signatureMode(placeholder: SignaturePlaceholder): SignatureMode {
        return signatureModes[placeholder] ?? "presencial";
    }

    function changeSignatureMode(
        placeholder: SignaturePlaceholder,
        mode: SignatureMode,
    ) {
        setSignatureModes((current) => ({ ...current, [placeholder]: mode }));

        if (mode === "remota") {
            setSignatures((current) => ({ ...current, [placeholder]: "" }));
        }
    }

    function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
        setForm((current) => ({ ...current, [key]: value }));
    }

    function handleVehicle(vehicleId: string) {
        const vehicle = veiculos.find((item) => item.id === vehicleId);

        setForm((current) => ({
            ...current,
            veiculo_id: vehicleId,
            proprietario_id: vehicle?.proprietario_id ?? current.proprietario_id,
            valor_caucao:
                !current.valor_caucao &&
                vehicle?.valor_caucao !== null &&
                vehicle?.valor_caucao !== undefined
                    ? String(vehicle.valor_caucao)
                    : current.valor_caucao,
        }));
    }

    function numeric(key: NumericField): number | null {
        const value = form[key].trim();
        return value ? Number(value) : null;
    }

    function validate(): string | null {
        if (!editing && !form.template_id) return "Selecione um template.";
        if (!form.tipo) return "Selecione o tipo do contrato.";

        if(financialTemplate && !editing){
            return "Os novos contratos de Prestação de Serviços e Aluguer devem ser criados no assistente de contratos.";
        }

        if(financialTemplate && editing){
            const billingError=validateBillingFields(
                campos as ContractWizardForm["campos_preenchidos"]
            );

            if(billingError)return billingError;
        }

        if (form.data_inicio && form.data_fim && form.data_fim < form.data_inicio) {
            return "A data de fim não pode ser anterior à data de início.";
        }

        for (const field of visibleFields) {
            if (!field.required) continue;

            const key = fieldKey(field);
            if (String(campos[key] ?? "").trim() === "") {
                return `Preencha o campo ${field.label || key}.`;
            }
        }

        if (editing) return null;

        if (mismatchedProcessSignatures.length > 0) {
            return (
                "O checklist exige assinaturas que não existem no documento: " +
                mismatchedProcessSignatures.join(", ") +
                "."
            );
        }

        if (required.includes("ASSINATURA_MOTORISTA") && !form.motorista_id) {
            return "O documento exige um motorista.";
        }

        if (
            required.includes("ASSINATURA_PROPRIETARIO") &&
            !form.proprietario_id
        ) {
            return "O documento exige um proprietário.";
        }

        if (required.includes("ASSINATURA_EMPRESA") && !form.empresa_id) {
            return "O documento exige uma empresa signatária.";
        }

        if (required.includes("ASSINATURA_TESTEMUNHA") && !witnessName.trim()) {
            return "Informe o nome da testemunha.";
        }

        for (const placeholder of required) {
            const mode = signatureMode(placeholder);

            if (mode === "presencial" && !signatures[placeholder]) {
                return `Preencha ${signatureLabel(placeholder)}.`;
            }

            if (mode !== "remota") continue;

            if (placeholder === "ASSINATURA_MOTORISTA") {
                const driver = motoristas.find(
                    (item) => item.id === form.motorista_id,
                );

                if (!driver?.email) {
                    return "O motorista precisa de um e-mail válido para assinatura remota.";
                }
            }

            if (placeholder === "ASSINATURA_PROPRIETARIO") {
                const owner = proprietarios.find(
                    (item) => item.id === form.proprietario_id,
                );

                if (!owner?.email) {
                    return "O proprietário precisa de um e-mail válido para assinatura remota.";
                }
            }

            if (placeholder === "ASSINATURA_EMPRESA") {
                const company = empresas.find((item) => item.id === form.empresa_id);

                if (!company?.email) {
                    return "A empresa precisa de um e-mail válido para assinatura remota.";
                }
            }

            if (
                placeholder === "ASSINATURA_TESTEMUNHA" &&
                !witnessEmail.trim()
            ) {
                return "Informe o e-mail da testemunha para assinatura remota.";
            }
        }

        return null;
    }

    async function save() {
        const validation = validate();

        if (validation) {
            setError(validation);
            return;
        }

        setSaving(true);
        setError(null);

        try {
            let response;

            if (contract) {
                response = await api.patch(`/api/contratos/${contract.id}`, {
                    proprietario_id: form.proprietario_id || null,
                    motorista_id: form.motorista_id || null,
                    veiculo_id: form.veiculo_id || null,
                    data_inicio: form.data_inicio || null,
                    data_fim: form.data_fim || null,
                    valor_diaria: numeric("valor_diaria"),
                    valor_caucao: numeric("valor_caucao"),
                    valor_total: numeric("valor_total"),
                    campos_preenchidos: campos,
                });
            } else {
                response = await api.post("/api/contratos", {
                    template_id: form.template_id,
                    tipo: form.tipo,
                    empresa_id: required.includes("ASSINATURA_EMPRESA")
                        ? form.empresa_id
                        : null,
                    proprietario_id: form.proprietario_id || null,
                    motorista_id: form.motorista_id || null,
                    veiculo_id: form.veiculo_id || null,
                    data_inicio: form.data_inicio || null,
                    data_fim: form.data_fim || null,
                    valor_diaria: numeric("valor_diaria"),
                    valor_caucao: numeric("valor_caucao"),
                    valor_total: numeric("valor_total"),
                    campos_preenchidos: campos,
                    assinaturas: required.map((placeholder) => {
                        const mode = signatureMode(placeholder);

                        return {
                            placeholder,
                            modo: mode,
                            assinatura_url:
                                mode === "presencial"
                                    ? signatures[placeholder]
                                    : undefined,
                            signatario_nome:
                                placeholder === "ASSINATURA_TESTEMUNHA"
                                    ? witnessName.trim()
                                    : undefined,
                            signatario_email:
                                placeholder === "ASSINATURA_TESTEMUNHA"
                                    ? witnessEmail.trim() || undefined
                                    : undefined,
                        };
                    }),
                });
            }

            const saved = response.data.data as Contrato;
            await onSuccess(saved);
            onClose();
        } catch (requestError) {
            setError(apiError(requestError));
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
            <button
                type="button"
                aria-label="Fechar"
                onClick={onClose}
                className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm"
            />

            {previewOpen && !editing && (
                <ContratoDocumentPreview
                    onClose={()=>setPreviewOpen(false)}
                    payload={{
                        template_id:form.template_id,
                        tipo:form.tipo,
                        empresa_id:form.empresa_id || null,
                        proprietario_id:form.proprietario_id || null,
                        motorista_id:form.motorista_id || null,
                        veiculo_id:form.veiculo_id || null,
                        data_inicio:form.data_inicio || null,
                        data_fim:form.data_fim || null,
                        valor_diaria:numeric("valor_diaria"),
                        valor_caucao:numeric("valor_caucao"),
                        valor_total:numeric("valor_total"),
                        campos_preenchidos:campos,
                    }}
                />
            )}
            <div className="relative flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                <header className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-7">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                            {editing ? "Editar rascunho" : "Novo contrato"}
                        </p>
                        <h2 className="mt-1 text-xl font-bold text-slate-950">
                            {editing
                                ? contract?.template?.nome ?? "Contrato"
                                : "Criar contrato"}
                        </h2>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto p-5 sm:p-7">
                    {error && (
                        <div className="mb-6 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                            <AlertCircle className="h-5 w-5 shrink-0" />
                            {error}
                        </div>
                    )}

                    <section>
                        <h3 className="font-semibold text-slate-900">Documento</h3>

                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <FieldSelect
                                label="Template *"
                                value={form.template_id}
                                disabled={editing}
                                onChange={(value) =>
                                    updateForm("template_id", value)
                                }
                            >
                                <option value="">Selecionar...</option>
                                {templates.map((template) => (
                                    <option key={template.id} value={template.id}>
                                        {template.nome}
                                        {template.perfil?.nome
                                            ? ` · ${template.perfil.nome}`
                                            : ""}
                                    </option>
                                ))}
                            </FieldSelect>

                            <FieldSelect
                                label="Tipo *"
                                value={form.tipo}
                                disabled={editing || locks.tipo}
                                onChange={(value) =>
                                    updateForm("tipo", value as ContratoTipo)
                                }
                            >
                                <option value="aluguer">Aluguer</option>
                                <option value="prestacao_servico">
                                    Prestação de serviços
                                </option>
                                <option value="checklist_entrega">
                                    Checklist de entrega
                                </option>
                                <option value="checklist_devolucao">
                                    Checklist de devolução
                                </option>
                            </FieldSelect>
                        </div>

                        {selectedTemplate && (
                            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <div className="text-sm font-semibold text-slate-800">
                                    Checklist de processo
                                </div>
                                <div className="mt-1 text-sm text-slate-500">
                                    {selectedTemplate.checklist_process_template
                                        ? `${selectedTemplate.checklist_process_template.nome} · v${selectedTemplate.checklist_process_template.versao}`
                                        : "Nenhum checklist associado"}
                                </div>
                            </div>
                        )}
                    </section>

                    <section className="mt-8">
                        <h3 className="font-semibold text-slate-900">Entidades</h3>

                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <FieldSelect
                                label="Motorista"
                                value={form.motorista_id}
                                disabled={locks.motorista}
                                onChange={(value) =>
                                    updateForm("motorista_id", value)
                                }
                            >
                                <option value="">Sem motorista</option>
                                {motoristas.map((motorista) => (
                                    <option key={motorista.id} value={motorista.id}>
                                        {motorista.nome_completo}
                                        {!motorista.ativo ? " · inativo" : ""}
                                    </option>
                                ))}
                            </FieldSelect>

                            <FieldSelect
                                label="Veículo"
                                value={form.veiculo_id}
                                disabled={locks.veiculo}
                                onChange={handleVehicle}
                            >
                                <option value="">Sem veículo</option>
                                {veiculos.map((vehicle) => (
                                    <option key={vehicle.id} value={vehicle.id}>
                                        {vehicle.matricula} · {vehicle.marca}{" "}
                                        {vehicle.modelo}
                                        {!vehicle.ativo ? " · inativo" : ""}
                                    </option>
                                ))}
                            </FieldSelect>

                            <FieldSelect
                                label="Proprietário"
                                value={form.proprietario_id}
                                disabled={locks.proprietario}
                                onChange={(value) =>
                                    updateForm("proprietario_id", value)
                                }
                            >
                                <option value="">Sem proprietário</option>
                                {proprietarios.map((owner) => (
                                    <option key={owner.id} value={owner.id}>
                                        {owner.nome_empresa ??
                                            owner.nome_completo ??
                                            owner.nif ??
                                            "Proprietário"}
                                    </option>
                                ))}
                            </FieldSelect>

                            {required.includes("ASSINATURA_EMPRESA") &&
                                !editing && (
                                    <FieldSelect
                                        label="Empresa signatária *"
                                        value={form.empresa_id}
                                        onChange={(value) =>
                                            updateForm("empresa_id", value)
                                        }
                                    >
                                        <option value="">Selecionar...</option>
                                        {empresas.map((company) => (
                                            <option
                                                key={company.id}
                                                value={company.id}
                                            >
                                                {company.nome_empresa}
                                            </option>
                                        ))}
                                    </FieldSelect>
                                )}
                        </div>

                        {selectedVehicle && (
                            <p className="mt-3 text-xs text-slate-400">
                                Veículo selecionado: {selectedVehicle.matricula} ·
                                valor semanal definido pelo servidor.
                            </p>
                        )}
                    </section>

                    <section className="mt-8">
                        <h3 className="font-semibold text-slate-900">
                            Período e valores
                        </h3>

                        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            <FieldInput
                                label="Data de início"
                                type="date"
                                value={form.data_inicio}
                                disabled={locks.datas}
                                onChange={(value) =>
                                    updateForm("data_inicio", value)
                                }
                            />
                            <FieldInput
                                label="Data de fim"
                                type="date"
                                value={form.data_fim}
                                disabled={locks.datas}
                                onChange={(value) =>
                                    updateForm("data_fim", value)
                                }
                            />
                            <FieldInput
                                label="Valor diário"
                                type="number"
                                value={form.valor_diaria}
                                onChange={(value) =>
                                    updateForm("valor_diaria", value)
                                }
                            />
                            <FieldInput
                                label="Caução"
                                type="number"
                                value={form.valor_caucao}
                                onChange={(value) =>
                                    updateForm("valor_caucao", value)
                                }
                            />
                            <FieldInput
                                label="Valor total"
                                type="number"
                                value={form.valor_total}
                                onChange={(value) =>
                                    updateForm("valor_total", value)
                                }
                            />
                        </div>
                    </section>

                    {financialTemplate && !editing && (
                        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                            Este modelo utiliza condições financeiras configuráveis.
                            Para criar um novo contrato, utilize o assistente de contratos,
                            selecionando Prestação de Serviços ou Aluguer.
                        </div>
                    )}

                    {financialTemplate && editing && (
                        <div className="mt-8">
                            <ContractBillingFields
                                fields={campos as ContractWizardForm["campos_preenchidos"]}
                                onChange={(key,value)=>
                                    setCampos(current=>({
                                        ...current,
                                        [key]:value,
                                    }))
                                }
                            />
                        </div>
                    )}

                    {visibleFields.length > 0 && (
                        <section className="mt-8">
                            <h3 className="font-semibold text-slate-900">
                                Campos do documento
                            </h3>
                            <p className="mt-1 text-sm text-slate-500">
                                Campos detectados no template selecionado.
                            </p>

                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                {visibleFields.map((field) => {
                                    const key = fieldKey(field);

                                    return (
                                        <FieldInput
                                            key={field.id ?? key}
                                            label={`${field.label || key}${field.required ? " *" : ""}`}
                                            type={htmlInputType(field)}
                                            value={String(campos[key] ?? "")}
                                            onChange={(value) =>
                                                setCampos((current) => ({
                                                    ...current,
                                                    [key]: value,
                                                }))
                                            }
                                        />
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {!editing && required.length > 0 && (
                        <section className="mt-8">
                            <div className="flex items-center gap-2">
                                <FileSignature className="h-5 w-5 text-indigo-600" />
                                <h3 className="font-semibold text-slate-900">
                                    Assinaturas
                                </h3>
                            </div>
                            <p className="mt-1 text-sm text-slate-500">
                                Escolha como cada signatário irá assinar o documento.
                            </p>

                            {required.includes("ASSINATURA_TESTEMUNHA") && (
                                <div className="mt-5 grid gap-4 md:grid-cols-2">
                                    <FieldInput
                                        label="Nome da testemunha *"
                                        value={witnessName}
                                        onChange={setWitnessName}
                                    />
                                    <FieldInput
                                        label="E-mail da testemunha"
                                        type="email"
                                        value={witnessEmail}
                                        onChange={setWitnessEmail}
                                    />
                                </div>
                            )}

                            <div className="mt-5 space-y-5">
                                {required.map((placeholder) => {
                                    const mode = signatureMode(placeholder);

                                    return (
                                        <div
                                            key={`${form.template_id}:${placeholder}`}
                                            className="rounded-2xl border border-slate-200 p-5"
                                        >
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                <div>
                                                    <div className="font-semibold text-slate-900">
                                                        {signatureLabel(placeholder)}
                                                    </div>
                                                    <div className="mt-1 text-xs text-slate-400">
                                                        {placeholder}
                                                    </div>
                                                </div>

                                                <div className="inline-flex rounded-xl bg-slate-100 p-1">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            changeSignatureMode(
                                                                placeholder,
                                                                "presencial",
                                                            )
                                                        }
                                                        className={[
                                                            "h-9 rounded-lg px-3 text-xs font-semibold",
                                                            mode === "presencial"
                                                                ? "bg-white text-indigo-700 shadow-sm"
                                                                : "text-slate-500",
                                                        ].join(" ")}
                                                    >
                                                        Presencial
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            changeSignatureMode(
                                                                placeholder,
                                                                "remota",
                                                            )
                                                        }
                                                        className={[
                                                            "h-9 rounded-lg px-3 text-xs font-semibold",
                                                            mode === "remota"
                                                                ? "bg-white text-indigo-700 shadow-sm"
                                                                : "text-slate-500",
                                                        ].join(" ")}
                                                    >
                                                        Remota
                                                    </button>
                                                </div>
                                            </div>

                                            {mode === "presencial" ? (
                                                <div className="mt-5">
                                                    <SignaturePad
                                                        label={signatureLabel(
                                                            placeholder,
                                                        )}
                                                        onChange={(value) =>
                                                            setSignatures(
                                                                (current) => ({
                                                                    ...current,
                                                                    [placeholder]:
                                                                        value,
                                                                }),
                                                            )
                                                        }
                                                    />
                                                </div>
                                            ) : (
                                                <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-700">
                                                    O signatário receberá por e-mail um
                                                    link seguro e um código OTP de 6
                                                    dígitos válido por 30 minutos.
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {!editing &&
                        selectedTemplate &&
                        mismatchedProcessSignatures.length > 0 && (
                            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                                O checklist de processo exige assinatura que não existe
                                no documento:{" "}
                                {mismatchedProcessSignatures.join(", ")}.
                            </div>
                        )}

                    {editing && (
                        <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
                            O template e o tipo ficam bloqueados durante a edição para
                            preservar o snapshot do processo. Cada atualização cria uma
                            nova versão do contrato.
                        </div>
                    )}
                </div>

                <footer className="flex flex-wrap justify-end gap-3 border-t border-slate-200 px-5 py-4 sm:px-7">
                    {!editing && (
                        <button
                            type="button"
                            onClick={()=>setPreviewOpen(true)}
                            disabled={saving || !form.template_id || financialTemplate}
                            className="inline-flex h-11 items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 text-sm font-semibold text-indigo-700 disabled:opacity-50"
                        >
                            Pré-visualizar documento
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-600"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={save}
                        disabled={saving}
                        className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                        {saving && (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                        )}
                        {editing ? "Guardar alterações" : "Criar contrato"}
                    </button>
                </footer>
            </div>
        </div>
    );
}

function FieldInput({
    label,
    value,
    type = "text",
    disabled = false,
    onChange,
}: {
    label: string;
    value: string;
    type?: string;
    disabled?: boolean;
    onChange: (value: string) => void;
}) {
    return (
        <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
                {label}
            </label>
            <input
                type={type}
                value={value}
                disabled={disabled}
                min={type === "number" ? "0" : undefined}
                step={type === "number" ? "0.01" : undefined}
                onChange={(event) => onChange(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:bg-slate-100"
            />
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
    onChange: (value: string) => void;
    children: ReactNode;
}) {
    return (
        <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
                {label}
            </label>
            <select
                value={value}
                disabled={disabled}
                onChange={(event) => onChange(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:bg-slate-100"
            >
                {children}
            </select>
        </div>
    );
}
