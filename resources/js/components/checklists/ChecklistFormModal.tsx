import axios from "axios";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
    AlertCircle,
    Car,
    ClipboardCheck,
    LoaderCircle,
    Plus,
    Trash2,
    UserRound,
    X,
} from "lucide-react";
import api from "../../lib/api";
import type { Motorista } from "../../types/motorista";
import type { Veiculo } from "../../types/veiculo";
import {
    CATEGORY_LABELS,
    CHECKLIST_ITEMS,
    VEHICLE_PARTS,
} from "../../types/checklist";
import type {
    ChecklistPayload,
    ChecklistRecord,
    ChecklistTipo,
    DamageRecord,
    DamageType,
    FuelLevel,
} from "../../types/checklist";
import SignaturePad from "./SignaturePad";

interface Props {
    open: boolean;
    tipo: ChecklistTipo;
    record: ChecklistRecord | null;
    initialDelivery?: ChecklistRecord | null;
    initialMotoristaId?: string | null;
    initialVeiculoId?: string | null;
    lockEntities?: boolean;
    records: ChecklistRecord[];
    motoristas: Motorista[];
    veiculos: Veiculo[];
    onClose: () => void;
    onSuccess: (record?: ChecklistRecord) => Promise<void>;
}

interface FormState {
    entrega_vinculada_id: string;
    motorista_id: string;
    veiculo_id: string;
    data_operacao: string;
    hora_operacao: string;
    quilometragem: string;
    nivel_combustivel: FuelLevel;
    observacoes: string;
}

const initialForm: FormState = {
    entrega_vinculada_id: "",
    motorista_id: "",
    veiculo_id: "",
    data_operacao: new Date().toISOString().slice(0, 10),
    hora_operacao: new Date().toTimeString().slice(0, 5),
    quilometragem: "",
    nivel_combustivel: "cheio",
    observacoes: "",
};

function apiError(error: unknown): string {
    if (axios.isAxiosError(error)) {
        return (
            error.response?.data?.message ??
            "Não foi possível concluir a operação."
        );
    }

    return "Não foi possível concluir a operação.";
}

function dateValue(value: string | null) {
    return value ? value.slice(0, 10) : "";
}

function timeValue(value: string | null) {
    return value ? value.slice(0, 5) : "";
}

export default function ChecklistFormModal({
    open,
    tipo,
    record,
    initialDelivery = null,
    initialMotoristaId = null,
    initialVeiculoId = null,
    lockEntities = false,
    records,
    motoristas,
    veiculos,
    onClose,
    onSuccess,
}: Props) {
    const [form, setForm] = useState<FormState>(initialForm);

    const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(
        {},
    );

    const [specialFields, setSpecialFields] = useState<Record<string, string>>(
        {},
    );

    const [damages, setDamages] = useState<DamageRecord[]>([]);

    const [missingItems, setMissingItems] = useState<Record<string, boolean>>(
        {},
    );

    const [newDamages, setNewDamages] = useState<DamageRecord[]>([]);

    const [signatureCompany, setSignatureCompany] = useState("");

    const [signatureDriver, setSignatureDriver] = useState("");

    const [error, setError] = useState("");

    const [submitting, setSubmitting] = useState(false);

    const finalizedDeliveries = useMemo(() => {
        return records.filter(
            (item) =>
                item.tipo === "entrega" &&
                item.estado === "finalizado" &&
                !item.recolha,
        );
    }, [records]);

    const selectedDelivery = useMemo(() => {
        if (tipo !== "recolha") {
            return null;
        }

        return (
            records.find((item) => item.id === form.entrega_vinculada_id) ??
            null
        );
    }, [records, tipo, form.entrega_vinculada_id]);

    useEffect(() => {
        if (!open) {
            return;
        }

        setError("");
        setSignatureCompany("");
        setSignatureDriver("");

        if (record) {
            setForm({
                entrega_vinculada_id: record.entrega_vinculada_id ?? "",
                motorista_id: record.motorista_id ?? "",
                veiculo_id: record.veiculo_id ?? "",
                data_operacao: dateValue(record.data_operacao),
                hora_operacao: timeValue(record.hora_operacao),
                quilometragem:
                    record.quilometragem !== null
                        ? String(record.quilometragem)
                        : "",
                nivel_combustivel: record.nivel_combustivel ?? "cheio",
                observacoes: record.observacoes ?? "",
            });

            setCheckedItems(record.itens ?? {});

            setSpecialFields(record.campos_especiais ?? {});

            setDamages(record.danos ?? []);

            setMissingItems(record.itens_faltantes ?? {});

            setNewDamages(record.novos_danos ?? []);

            return;
        }

        const delivery = initialDelivery;

        setForm({
            ...initialForm,
            entrega_vinculada_id: delivery?.id ?? "",
            motorista_id: delivery?.motorista_id ?? initialMotoristaId ?? "",
            veiculo_id: delivery?.veiculo_id ?? initialVeiculoId ?? "",
        });

        setCheckedItems({});
        setSpecialFields({});
        setDamages([]);
        setMissingItems({});
        setNewDamages([]);
    }, [open, record, initialDelivery, initialMotoristaId, initialVeiculoId]);

    useEffect(() => {
        if (tipo !== "recolha" || !selectedDelivery || record) {
            return;
        }

        setForm((current) => ({
            ...current,
            motorista_id: selectedDelivery.motorista_id ?? "",
            veiculo_id: selectedDelivery.veiculo_id ?? "",
        }));
    }, [selectedDelivery, tipo, record]);

    const penalty = useMemo(() => {
        if (tipo !== "recolha") {
            return 0;
        }

        const missingTotal = CHECKLIST_ITEMS.reduce(
            (total, item) =>
                total + (missingItems[item.id] ? item.replacementValue : 0),
            0,
        );

        const damageTotal = newDamages.reduce(
            (total, damage) => total + Number(damage.value ?? 0),
            0,
        );

        return missingTotal + damageTotal;
    }, [tipo, missingItems, newDamages]);

    if (!open) {
        return null;
    }

    function updateForm<K extends keyof FormState>(
        field: K,
        value: FormState[K],
    ) {
        setForm((current) => ({
            ...current,
            [field]: value,
        }));
    }

    function toggleItem(id: string) {
        setCheckedItems((current) => ({
            ...current,
            [id]: !current[id],
        }));
    }

    function toggleMissing(id: string) {
        setMissingItems((current) => ({
            ...current,
            [id]: !current[id],
        }));
    }

    function addDamage(target: "delivery" | "return") {
        const damage: DamageRecord = {
            part: VEHICLE_PARTS[0].name,
            types: ["riscado"],
            status: "riscado",
            value: VEHICLE_PARTS[0].damageValue,
        };

        if (target === "delivery") {
            setDamages((current) => [...current, damage]);
        } else {
            setNewDamages((current) => [...current, damage]);
        }
    }

    function updateDamage(
        target: "delivery" | "return",
        index: number,
        patch: Partial<DamageRecord>,
    ) {
        const setter = target === "delivery" ? setDamages : setNewDamages;

        setter((current) =>
            current.map((damage, damageIndex) =>
                damageIndex === index
                    ? {
                          ...damage,
                          ...patch,
                      }
                    : damage,
            ),
        );
    }

    function removeDamage(target: "delivery" | "return", index: number) {
        const setter = target === "delivery" ? setDamages : setNewDamages;

        setter((current) =>
            current.filter((_, damageIndex) => damageIndex !== index),
        );
    }

    function payload(): ChecklistPayload {
        return {
            tipo,
            motorista_id: form.motorista_id,
            veiculo_id: form.veiculo_id,
            entrega_vinculada_id:
                tipo === "recolha" ? form.entrega_vinculada_id : null,
            data_operacao: form.data_operacao,
            hora_operacao: form.hora_operacao || null,
            quilometragem: Number(form.quilometragem),
            nivel_combustivel: form.nivel_combustivel,
            penalizacao_total: tipo === "recolha" ? penalty : 0,
            itens: tipo === "entrega" ? checkedItems : {},
            campos_especiais: tipo === "entrega" ? specialFields : {},
            danos: tipo === "entrega" ? damages : [],
            itens_faltantes: tipo === "recolha" ? missingItems : {},
            novos_danos: tipo === "recolha" ? newDamages : [],
            observacoes: form.observacoes.trim() || null,
        };
    }

    function validateForm(finalize: boolean): string | null {
        if (tipo === "recolha" && !form.entrega_vinculada_id) {
            return "Selecione a entrega correspondente.";
        }

        if (!form.motorista_id) {
            return "Selecione o motorista.";
        }

        if (!form.veiculo_id) {
            return "Selecione o veículo.";
        }

        if (!form.data_operacao) {
            return "Informe a data da operação.";
        }

        if (form.quilometragem === "" || Number(form.quilometragem) < 0) {
            return "Informe uma quilometragem válida.";
        }

        if (
            tipo === "recolha" &&
            selectedDelivery?.quilometragem !== null &&
            selectedDelivery?.quilometragem !== undefined &&
            Number(form.quilometragem) < Number(selectedDelivery.quilometragem)
        ) {
            return "A quilometragem da recolha não pode ser inferior à quilometragem da entrega.";
        }

        if (finalize && (!signatureCompany || !signatureDriver)) {
            return "As assinaturas da empresa e do motorista são obrigatórias para finalizar.";
        }

        return null;
    }

    async function save(finalize: boolean) {
        const validation = validateForm(finalize);

        if (validation) {
            setError(validation);

            return;
        }

        setSubmitting(true);
        setError("");

        try {
            let id = record?.id ?? null;
            let savedRecord: ChecklistRecord | undefined;

            if (record) {
                const {
                    tipo: _tipo,
                    entrega_vinculada_id: _entrega,
                    ...updatePayload
                } = payload();

                const response = await api.patch(
                    `/api/checklists/${record.id}`,
                    updatePayload,
                );

                savedRecord = response.data.data as ChecklistRecord;
            } else {
                const response = await api.post("/api/checklists", payload());
                savedRecord = response.data.data as ChecklistRecord;
                id = savedRecord.id;
            }

            if (finalize && id) {
                const response = await api.post(
                    `/api/checklists/${id}/finalizar`,
                    {
                        assinatura_empresa: signatureCompany,
                        assinatura_motorista: signatureDriver,
                    },
                );

                savedRecord = response.data.data as ChecklistRecord;
            }

            await onSuccess(savedRecord);
            onClose();
        } catch (exception) {
            setError(apiError(exception));
        } finally {
            setSubmitting(false);
        }
    }

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();

        await save(false);
    }

    const inputClass =
        "w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

    const labelClass = "block text-sm font-medium text-slate-700 mb-1.5";

    const disabled = record?.estado === "finalizado";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
            <button
                type="button"
                aria-label="Fechar"
                onClick={onClose}
                className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm"
            />

            <div className="relative w-full max-w-6xl max-h-[96vh] overflow-hidden rounded-2xl bg-white shadow-2xl">
                <header className="h-20 px-5 sm:px-7 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <ClipboardCheck className="w-5 h-5" />
                        </div>

                        <div>
                            <h2 className="font-semibold text-lg text-slate-950">
                                {record
                                    ? record.tipo === "entrega"
                                        ? "Editar entrega"
                                        : "Editar recolha"
                                    : tipo === "entrega"
                                      ? "Nova entrega"
                                      : "Nova recolha"}
                            </h2>

                            <p className="text-sm text-slate-500">
                                {tipo === "entrega"
                                    ? "Registo do estado do veículo no momento da entrega."
                                    : "Registo de devolução, faltas, novos danos e penalizações."}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </header>

                <form
                    onSubmit={handleSubmit}
                    className="overflow-y-auto max-h-[calc(96vh-80px)]"
                >
                    <div className="p-5 sm:p-7 space-y-8">
                        {error && (
                            <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex gap-3 text-sm text-red-700">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                {error}
                            </div>
                        )}

                        {tipo === "recolha" && !record && (
                            <section>
                                <h3 className="font-semibold text-slate-900 mb-4">
                                    Entrega de origem
                                </h3>

                                <div>
                                    <label className={labelClass}>
                                        Entrega *
                                    </label>

                                    <select
                                        value={form.entrega_vinculada_id}
                                        onChange={(event) =>
                                            updateForm(
                                                "entrega_vinculada_id",
                                                event.target.value,
                                            )
                                        }
                                        className={inputClass}
                                        required
                                    >
                                        <option value="">
                                            Selecionar entrega
                                        </option>

                                        {finalizedDeliveries.map((delivery) => (
                                            <option
                                                key={delivery.id}
                                                value={delivery.id}
                                            >
                                                {delivery.matricula_snapshot ??
                                                    "Sem matrícula"}{" "}
                                                —{" "}
                                                {delivery.motorista_nome_snapshot ??
                                                    "Sem motorista"}{" "}
                                                —{" "}
                                                {dateValue(
                                                    delivery.data_operacao,
                                                )}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </section>
                        )}

                        <section>
                            <h3 className="font-semibold text-slate-900 mb-4">
                                Operação
                            </h3>

                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div>
                                    <label className={labelClass}>
                                        Motorista *
                                    </label>

                                    <select
                                        value={form.motorista_id}
                                        onChange={(event) =>
                                            updateForm(
                                                "motorista_id",
                                                event.target.value,
                                            )
                                        }
                                        disabled={disabled || tipo==="recolha" || lockEntities}
                                        required
                                        className={inputClass}
                                    >
                                        <option value="">
                                            Selecionar motorista
                                        </option>

                                        {motoristas.map((motorista) => (
                                            <option
                                                key={motorista.id}
                                                value={motorista.id}
                                            >
                                                {motorista.nome_completo}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className={labelClass}>
                                        Veículo *
                                    </label>

                                    <select
                                        value={form.veiculo_id}
                                        onChange={(event) =>
                                            updateForm(
                                                "veiculo_id",
                                                event.target.value,
                                            )
                                        }
                                        disabled={disabled || tipo==="recolha" || lockEntities}
                                        required
                                        className={inputClass}
                                    >
                                        <option value="">
                                            Selecionar veículo
                                        </option>

                                        {veiculos.map((veiculo) => (
                                            <option
                                                key={veiculo.id}
                                                value={veiculo.id}
                                            >
                                                {veiculo.matricula} —{" "}
                                                {veiculo.marca} {veiculo.modelo}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className={labelClass}>Data *</label>

                                    <input
                                        type="date"
                                        value={form.data_operacao}
                                        onChange={(event) =>
                                            updateForm(
                                                "data_operacao",
                                                event.target.value,
                                            )
                                        }
                                        disabled={disabled}
                                        required
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label className={labelClass}>Hora</label>

                                    <input
                                        type="time"
                                        value={form.hora_operacao}
                                        onChange={(event) =>
                                            updateForm(
                                                "hora_operacao",
                                                event.target.value,
                                            )
                                        }
                                        disabled={disabled}
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label className={labelClass}>
                                        Quilometragem *
                                    </label>

                                    <input
                                        type="number"
                                        min="0"
                                        value={form.quilometragem}
                                        onChange={(event) =>
                                            updateForm(
                                                "quilometragem",
                                                event.target.value,
                                            )
                                        }
                                        disabled={disabled}
                                        required
                                        className={inputClass}
                                    />

                                    {tipo === "recolha" &&
                                        selectedDelivery?.quilometragem !==
                                            null && (
                                            <p className="mt-1 text-xs text-slate-400">
                                                Entrega:{" "}
                                                {
                                                    selectedDelivery?.quilometragem
                                                }{" "}
                                                km
                                            </p>
                                        )}
                                </div>

                                <div>
                                    <label className={labelClass}>
                                        Combustível / carga *
                                    </label>

                                    <select
                                        value={form.nivel_combustivel}
                                        onChange={(event) =>
                                            updateForm(
                                                "nivel_combustivel",
                                                event.target.value as FuelLevel,
                                            )
                                        }
                                        disabled={disabled}
                                        className={inputClass}
                                    >
                                        <option value="1/4">1/4</option>

                                        <option value="1/2">1/2</option>

                                        <option value="3/4">3/4</option>

                                        <option value="cheio">Cheio</option>
                                    </select>
                                </div>
                            </div>
                        </section>

                        {tipo === "entrega" && (
                            <ItemsSection
                                checkedItems={checkedItems}
                                specialFields={specialFields}
                                disabled={disabled}
                                onToggle={toggleItem}
                                onSpecial={(key, value) =>
                                    setSpecialFields((current) => ({
                                        ...current,
                                        [key]: value,
                                    }))
                                }
                            />
                        )}

                        {tipo === "recolha" && selectedDelivery && (
                            <section>
                                <h3 className="font-semibold text-slate-900 mb-2">
                                    Itens em falta
                                </h3>

                                <p className="text-sm text-slate-500 mb-4">
                                    Marque apenas os itens que estavam presentes
                                    na entrega e não foram devolvidos.
                                </p>

                                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {CHECKLIST_ITEMS.filter(
                                        (item) =>
                                            selectedDelivery.itens?.[item.id],
                                    ).map((item) => (
                                        <label
                                            key={item.id}
                                            className={[
                                                "rounded-xl border p-4 flex items-start gap-3 cursor-pointer",
                                                missingItems[item.id]
                                                    ? "border-red-300 bg-red-50"
                                                    : "border-slate-200 bg-white",
                                            ].join(" ")}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={Boolean(
                                                    missingItems[item.id],
                                                )}
                                                onChange={() =>
                                                    toggleMissing(item.id)
                                                }
                                                disabled={disabled}
                                                className="mt-1"
                                            />

                                            <div>
                                                <div className="text-sm font-medium text-slate-800">
                                                    {item.name}
                                                </div>

                                                <div className="mt-1 text-xs text-slate-500">
                                                    Penalização:{" "}
                                                    {item.replacementValue.toLocaleString(
                                                        "pt-PT",
                                                        {
                                                            style: "currency",
                                                            currency: "EUR",
                                                        },
                                                    )}
                                                </div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </section>
                        )}

                        <DamageSection
                            title={
                                tipo === "entrega"
                                    ? "Danos existentes"
                                    : "Novos danos"
                            }
                            description={
                                tipo === "entrega"
                                    ? "Registe os danos existentes antes da entrega do veículo."
                                    : "Registe apenas danos que não constavam na entrega."
                            }
                            damages={tipo === "entrega" ? damages : newDamages}
                            disabled={disabled}
                            target={tipo === "entrega" ? "delivery" : "return"}
                            onAdd={addDamage}
                            onUpdate={updateDamage}
                            onRemove={removeDamage}
                        />

                        {tipo === "recolha" && (
                            <section>
                                <h3 className="font-semibold text-slate-900 mb-4">
                                    Avaliação financeira
                                </h3>

                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-600">
                                            Penalizações calculadas
                                        </span>

                                        <span className="text-xl font-bold text-red-600">
                                            {penalty.toLocaleString("pt-PT", {
                                                style: "currency",
                                                currency: "EUR",
                                            })}
                                        </span>
                                    </div>

                                    <p className="mt-2 text-xs text-slate-400">
                                        Nesta fase o valor é apresentado a
                                        partir dos itens em falta e danos
                                        registados. O cálculo será
                                        posteriormente consolidado no servidor
                                        antes da integração financeira dos
                                        alugueres.
                                    </p>
                                </div>
                            </section>
                        )}

                        <section>
                            <h3 className="font-semibold text-slate-900 mb-4">
                                Observações
                            </h3>

                            <textarea
                                value={form.observacoes}
                                onChange={(event) =>
                                    updateForm(
                                        "observacoes",
                                        event.target.value,
                                    )
                                }
                                disabled={disabled}
                                rows={4}
                                className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                                placeholder="Observações relevantes sobre o estado do veículo..."
                            />
                        </section>

                        {!disabled && (
                            <section>
                                <h3 className="font-semibold text-slate-900 mb-2">
                                    Assinaturas
                                </h3>

                                <p className="text-sm text-slate-500 mb-5">
                                    Necessárias apenas para finalizar o
                                    checklist.
                                </p>

                                <div className="grid lg:grid-cols-2 gap-6">
                                    <SignaturePad
                                        label="Assinatura da empresa"
                                        onChange={setSignatureCompany}
                                    />

                                    <SignaturePad
                                        label="Assinatura do motorista"
                                        onChange={setSignatureDriver}
                                    />
                                </div>
                            </section>
                        )}
                    </div>

                    {!disabled && (
                        <footer className="sticky bottom-0 border-t border-slate-200 bg-white px-5 sm:px-7 py-4 flex flex-col sm:flex-row sm:justify-end gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={submitting}
                                className="h-11 px-5 rounded-xl border border-slate-200 text-sm font-semibold"
                            >
                                Cancelar
                            </button>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="h-11 px-5 rounded-xl border border-indigo-200 text-indigo-700 bg-indigo-50 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {submitting && (
                                    <LoaderCircle className="w-4 h-4 animate-spin" />
                                )}
                                Guardar rascunho
                            </button>

                            <button
                                type="button"
                                disabled={submitting}
                                onClick={() => save(true)}
                                className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {submitting && (
                                    <LoaderCircle className="w-4 h-4 animate-spin" />
                                )}
                                Finalizar checklist
                            </button>
                        </footer>
                    )}
                </form>
            </div>
        </div>
    );
}

function ItemsSection({
    checkedItems,
    specialFields,
    disabled,
    onToggle,
    onSpecial,
}: {
    checkedItems: Record<string, boolean>;
    specialFields: Record<string, string>;
    disabled: boolean;
    onToggle: (id: string) => void;
    onSpecial: (key: string, value: string) => void;
}) {
    return (
        <section>
            <h3 className="font-semibold text-slate-900 mb-2">
                Itens entregues
            </h3>

            <p className="text-sm text-slate-500 mb-5">
                Confirme documentos, equipamentos obrigatórios e acessórios
                presentes.
            </p>

            <div className="space-y-6">
                {(["documentacao", "equipamento", "acessorio"] as const).map(
                    (category) => (
                        <div key={category}>
                            <h4 className="text-sm font-semibold text-slate-700 mb-3">
                                {CATEGORY_LABELS[category]}
                            </h4>

                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {CHECKLIST_ITEMS.filter(
                                    (item) => item.category === category,
                                ).map((item) => (
                                    <div
                                        key={item.id}
                                        className={[
                                            "rounded-xl border p-4",
                                            checkedItems[item.id]
                                                ? "border-emerald-300 bg-emerald-50/50"
                                                : "border-slate-200 bg-white",
                                        ].join(" ")}
                                    >
                                        <label className="flex gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={Boolean(
                                                    checkedItems[item.id],
                                                )}
                                                onChange={() =>
                                                    onToggle(item.id)
                                                }
                                                disabled={disabled}
                                                className="mt-1"
                                            />

                                            <div>
                                                <div className="text-sm font-medium text-slate-800">
                                                    {item.name}
                                                </div>

                                                <div className="mt-1 text-xs text-slate-400">
                                                    {item.required
                                                        ? "Obrigatório"
                                                        : "Opcional"}
                                                </div>
                                            </div>
                                        </label>

                                        {item.specialField &&
                                            checkedItems[item.id] && (
                                                <div className="mt-3">
                                                    <label className="block mb-1 text-xs text-slate-500">
                                                        {
                                                            item.specialField
                                                                .label
                                                        }
                                                    </label>

                                                    <input
                                                        type={
                                                            item.specialField
                                                                .type
                                                        }
                                                        value={
                                                            specialFields[
                                                                item
                                                                    .specialField
                                                                    .key
                                                            ] ?? ""
                                                        }
                                                        onChange={(event) =>
                                                            onSpecial(
                                                                item
                                                                    .specialField!
                                                                    .key,
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                        disabled={disabled}
                                                        className="w-full h-9 rounded-lg border border-slate-200 px-2.5 text-xs"
                                                    />
                                                </div>
                                            )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ),
                )}
            </div>
        </section>
    );
}

function DamageSection({
    title,
    description,
    damages,
    disabled,
    target,
    onAdd,
    onUpdate,
    onRemove,
}: {
    title: string;
    description: string;
    damages: DamageRecord[];
    disabled: boolean;
    target: "delivery" | "return";
    onAdd: (target: "delivery" | "return") => void;
    onUpdate: (
        target: "delivery" | "return",
        index: number,
        patch: Partial<DamageRecord>,
    ) => void;
    onRemove: (target: "delivery" | "return", index: number) => void;
}) {
    return (
        <section>
            <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                    <h3 className="font-semibold text-slate-900">{title}</h3>

                    <p className="mt-1 text-sm text-slate-500">{description}</p>
                </div>

                {!disabled && (
                    <button
                        type="button"
                        onClick={() => onAdd(target)}
                        className="shrink-0 h-10 px-4 rounded-xl border border-slate-200 flex items-center gap-2 text-sm font-semibold"
                    >
                        <Plus className="w-4 h-4" />
                        Adicionar
                    </button>
                )}
            </div>

            {damages.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                    Nenhum dano registado.
                </div>
            ) : (
                <div className="space-y-3">
                    {damages.map((damage, index) => (
                        <div
                            key={index}
                            className="rounded-xl border border-slate-200 p-4 grid lg:grid-cols-[2fr_1fr_1fr_auto] gap-3 items-end"
                        >
                            <div>
                                <label className="block mb-1.5 text-xs font-medium text-slate-500">
                                    Parte do veículo
                                </label>

                                <select
                                    value={damage.part}
                                    disabled={disabled}
                                    onChange={(event) => {
                                        const part = VEHICLE_PARTS.find(
                                            (item) =>
                                                item.name ===
                                                event.target.value,
                                        );

                                        onUpdate(target, index, {
                                            part: event.target.value,
                                            value: part?.damageValue ?? 0,
                                        });
                                    }}
                                    className="w-full h-10 rounded-lg border border-slate-200 px-2 text-sm"
                                >
                                    {VEHICLE_PARTS.map((part) => (
                                        <option key={part.id} value={part.name}>
                                            {part.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block mb-1.5 text-xs font-medium text-slate-500">
                                    Tipo
                                </label>

                                <select
                                    value={damage.types?.[0] ?? "riscado"}
                                    disabled={disabled}
                                    onChange={(event) =>
                                        onUpdate(target, index, {
                                            types: [
                                                event.target
                                                    .value as DamageType,
                                            ],
                                            status: event.target
                                                .value as DamageType,
                                        })
                                    }
                                    className="w-full h-10 rounded-lg border border-slate-200 px-2 text-sm"
                                >
                                    <option value="riscado">Riscado</option>

                                    <option value="amassado">Amassado</option>

                                    <option value="quebrado">Quebrado</option>
                                </select>
                            </div>

                            <div>
                                <label className="block mb-1.5 text-xs font-medium text-slate-500">
                                    Valor
                                </label>

                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={damage.value ?? 0}
                                    disabled={disabled}
                                    onChange={(event) =>
                                        onUpdate(target, index, {
                                            value: Number(event.target.value),
                                        })
                                    }
                                    className="w-full h-10 rounded-lg border border-slate-200 px-2 text-sm"
                                />
                            </div>

                            {!disabled && (
                                <button
                                    type="button"
                                    onClick={() => onRemove(target, index)}
                                    className="w-10 h-10 rounded-lg border border-red-200 bg-red-50 text-red-600 flex items-center justify-center"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
