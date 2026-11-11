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
    ContractWizardForm,
    TipoContrato,
    TipoContratoCampoConfiguracao,
} from "../../../types/tipo-contrato";
import type {
    Veiculo,
} from "../../../types/veiculo";
import type { ReactNode } from "react";
import ContractBillingFields from "./ContractBillingFields";
import ContractRgpdFields, { isRgpdType, rgpdTypeConfigurationError, type RgpdFuncionario } from "./ContractRgpdFields";

interface Props {
    type: TipoContrato;
    form: ContractWizardForm;

    empresas: Empresa[];
    proprietarios: Proprietario[];
    motoristas: Motorista[];
    veiculos: Veiculo[];
    funcionarios: RgpdFuncionario[];
    funcionariosLoading: boolean;
    funcionariosError: string;
    funcionarioSearch: string;
    onFuncionarioSearch: (value: string) => void;

    onField: (
        field: keyof Omit<
            ContractWizardForm,
            "campos_preenchidos"
        >,
        value: string,
    ) => void;

    onCustomField: (
        key: string,
        value: string | number | boolean | null,
    ) => void;

    onVehicle: (id: string) => void;
}

const standardFields = new Set([
    "DATA_INICIO",
    "DATA_FIM",
    "VALOR_DIARIA",
    "VALOR_CAUCAO",
    "VALOR_TOTAL",
]);

const billingFields=new Set([
    "PERCENTAGEM_CONTRATO",
    "TIPO_COBRANCA",
    "VALOR_FIXO_COBRANCA",
    "PERCENTAGEM_COBRANCA",
    "BASE_CALCULO_COBRANCA",
    "PERIODICIDADE_PAGAMENTO",
    "CONDICOES_COBRANCA",
    "PERIODICIDADE_PAGAMENTO_TEXTO",
]);

function fieldLabel(value: string): string {
    return value
        .toLowerCase()
        .replace(/_/g, " ")
        .replace(/\b\w/g, (letter) =>
            letter.toUpperCase(),
        );
}

function signatureRequires(
    type: TipoContrato,
    placeholder: string,
): boolean {
    return type.assinaturas_configuracao.some(
        (signature) =>
            signature.placeholder === placeholder,
    );
}

/*
 * FROTAPRO_4Q4_REQUIRED_FIRST_PAYMENT
 *
 * O campo e exigido pelo template ou pela
 * configuracao explicita do tipo contratual.
 */
export function requiresFirstPaymentDate(
    type: TipoContrato,
): boolean {
    return Boolean(type.primeiro_pagamento_obrigatorio) ||
        type.campos_configuracao.some(
            (field) =>
                field.campo.trim().toUpperCase() ===
                "DATA_PRIMEIRO_PAGAMENTO",
        );
}

function manualFields(
    type: TipoContrato,
): TipoContratoCampoConfiguracao[] {
    return type.campos_configuracao.filter(
        (field) =>
            field.origem === "manual" &&
            !(isRgpdType(type) && field.campo.trim().toUpperCase().startsWith("RGPD_")) &&
            !standardFields.has(
                field.campo.trim().toUpperCase(),
            ) &&
            !(
                requiresFirstPaymentDate(type) &&
                field.campo.trim().toUpperCase() ===
                    "DATA_PRIMEIRO_PAGAMENTO"
            ) &&
            !(
                type.cobranca_habilitada &&
                billingFields.has(field.campo.trim().toUpperCase())
            ),
    );
}

export default function ContractIdentificationStep({
    type,
    form,
    empresas,
    proprietarios,
    motoristas,
    veiculos,
    funcionarios,
    funcionariosLoading,
    funcionariosError,
    funcionarioSearch,
    onFuncionarioSearch,
    onField,
    onCustomField,
    onVehicle,
}: Props) {
    const isRgpd = isRgpdType(type);
    const titularTipo = String(form.campos_preenchidos.RGPD_TITULAR_TIPO ?? "");

    const showEmpresa =
        isRgpd || Boolean(type.entidades.empresa) ||
        signatureRequires(
            type,
            "ASSINATURA_EMPRESA",
        );

    const showProprietario = isRgpd
        ? titularTipo === "proprietario"
        : Boolean(type.entidades.proprietario) || signatureRequires(type, "ASSINATURA_PROPRIETARIO");

    const showMotorista = isRgpd
        ? titularTipo === "motorista"
        : Boolean(type.entidades.motorista) || signatureRequires(type, "ASSINATURA_MOTORISTA");

    const showVeiculo = !isRgpd && Boolean(type.entidades.veiculo);

    const fields =
        manualFields(type);

    /*
     * FROTAPRO_4Q1_REQUIRED_FIELDS
     *
     * As indicacoes visuais devem acompanhar
     * as validacoes do wizard e a configuracao
     * dos tipos de contrato.
     */
    const requiresDateRange = [
        "contrato_de_prestacao_de_servicos",
        "aluguer_tvde_pessoa_singular",
        "aluguer_tvde_pessoa_coletiva",
    ].includes(type.codigo);

    const requiredManualFields = new Set(
        type.campos_configuracao
            .filter(
                (field) =>
                    field.origem === "manual" &&
                    field.obrigatorio,
            )
            .map(
                (field) =>
                    field.campo.trim().toUpperCase(),
            ),
    );

    const requiresField = (field: string): boolean =>
        requiredManualFields.has(field);

    return (
        <div className="space-y-8">
            <section>
                <div>
                    <h3 className="text-lg font-semibold text-slate-950">
                        Identificação
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                        Selecione as entidades relacionadas com este
                        contrato.
                    </p>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {showEmpresa && (
                        <SelectField
                            label="Empresa"
                            required={
                                Boolean(type.entidades.empresa) ||
                                signatureRequires(
                                    type,
                                    "ASSINATURA_EMPRESA",
                                )
                            }
                            value={form.empresa_id}
                            onChange={(value) =>
                                onField(
                                    "empresa_id",
                                    value,
                                )
                            }
                        >
                            <option value="">
                                Selecionar...
                            </option>

                            {empresas.map((item) => (
                                <option
                                    key={item.id}
                                    value={item.id}
                                >
                                    {item.nome_empresa}
                                </option>
                            ))}
                        </SelectField>
                    )}

                    {showMotorista && (
                        <SelectField
                            label="Motorista"
                            required={
                                isRgpd || Boolean(
                                    type.entidades
                                        .motorista,
                                ) ||
                                signatureRequires(
                                    type,
                                    "ASSINATURA_MOTORISTA",
                                )
                            }
                            value={form.motorista_id}
                            onChange={(value) =>
                                onField(
                                    "motorista_id",
                                    value,
                                )
                            }
                        >
                            <option value="">
                                Selecionar...
                            </option>

                            {motoristas.map((item) => (
                                <option
                                    key={item.id}
                                    value={item.id}
                                >
                                    {item.nome_completo}
                                </option>
                            ))}
                        </SelectField>
                    )}

                    {showVeiculo && (
                        <SelectField
                            label="Veículo"
                            required
                            value={form.veiculo_id}
                            onChange={onVehicle}
                        >
                            <option value="">
                                Selecionar...
                            </option>

                            {veiculos.map((item) => (
                                <option
                                    key={item.id}
                                    value={item.id}
                                >
                                    {item.matricula} —{" "}
                                    {item.marca}{" "}
                                    {item.modelo}
                                </option>
                            ))}
                        </SelectField>
                    )}

                    {showProprietario && (
                        <SelectField
                            label="Proprietário"
                            required={
                                isRgpd || Boolean(
                                    type.entidades
                                        .proprietario,
                                ) ||
                                signatureRequires(
                                    type,
                                    "ASSINATURA_PROPRIETARIO",
                                )
                            }
                            value={form.proprietario_id}
                            onChange={(value) =>
                                onField(
                                    "proprietario_id",
                                    value,
                                )
                            }
                        >
                            <option value="">
                                Selecionar...
                            </option>

                            {proprietarios.map(
                                (item) => (
                                    <option
                                        key={item.id}
                                        value={item.id}
                                    >
                                        {item.nome_empresa ??
                                            item.nome_completo ??
                                            item.nif ??
                                            item.id}
                                    </option>
                                ),
                            )}
                        </SelectField>
                    )}
                </div>
            </section>

            {isRgpd && rgpdTypeConfigurationError(type) && (
                <div
                    role="alert"
                    className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
                >
                    <p className="font-semibold">
                        Configuração RGPD incompleta
                    </p>
                    <p className="mt-2">
                        {rgpdTypeConfigurationError(type)}
                    </p>
                </div>
            )}

            {isRgpd && (
                <ContractRgpdFields
                    type={type}
                    form={form}
                    funcionarios={funcionarios}
                    loading={funcionariosLoading}
                    error={funcionariosError}
                    search={funcionarioSearch}
                    onSearch={onFuncionarioSearch}
                    onField={onField}
                    onCustomField={onCustomField}
                />
            )}

            {!isRgpd && (<section className="border-t border-slate-200 pt-7">
                <h3 className="text-lg font-semibold text-slate-950">
                    Condições
                </h3>

                <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <InputField
                        label="Data de início"
                        required={requiresDateRange || requiresField("DATA_INICIO")}
                        type="date"
                        value={form.data_inicio}
                        onChange={(value) =>
                            onField(
                                "data_inicio",
                                value,
                            )
                        }
                    />

                    <InputField
                        label="Data de fim"
                        required={requiresDateRange || requiresField("DATA_FIM")}
                        type="date"
                        value={form.data_fim}
                        onChange={(value) =>
                            onField(
                                "data_fim",
                                value,
                            )
                        }
                    />

                    {requiresFirstPaymentDate(type) && (
                        <InputField
                            label="Data do primeiro pagamento"
                            type="date"
                            required
                            value={String(
                                form.campos_preenchidos[
                                    "DATA_PRIMEIRO_PAGAMENTO"
                                ] ?? "",
                            )}
                            onChange={(value) =>
                                onCustomField(
                                    "DATA_PRIMEIRO_PAGAMENTO",
                                    value,
                                )
                            }
                        />
                    )}

                    <InputField
                        label="Valor diário"
                        required={requiresField("VALOR_DIARIA")}
                        type="number"
                        value={form.valor_diaria}
                        onChange={(value) =>
                            onField(
                                "valor_diaria",
                                value,
                            )
                        }
                    />

                    <InputField
                        label="Caução"
                        required={requiresField("VALOR_CAUCAO")}
                        type="number"
                        value={form.valor_caucao}
                        onChange={(value) =>
                            onField(
                                "valor_caucao",
                                value,
                            )
                        }
                    />

                    <InputField
                        label="Valor total"
                        required={requiresField("VALOR_TOTAL")}
                        type="number"
                        value={form.valor_total}
                        onChange={(value) =>
                            onField(
                                "valor_total",
                                value,
                            )
                        }
                    />
                </div>
            </section>)}

            {!isRgpd && type.cobranca_habilitada && (
                <ContractBillingFields
                    fields={form.campos_preenchidos}
                    onChange={onCustomField}
                />
            )}

            {fields.length > 0 && (
                <section className="border-t border-slate-200 pt-7">
                    <h3 className="text-lg font-semibold text-slate-950">
                        Campos do contrato
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                        Estes campos foram definidos na configuração
                        deste tipo de contrato.
                    </p>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                        {fields.map((field) => {
                            const value =
                                form.campos_preenchidos[
                                    field.campo
                                ];

                            const options =
                                field.opcoes ?? [];

                            if (options.length > 0) {
                                return (
                                    <SelectField
                                        key={field.campo}
                                        label={fieldLabel(
                                            field.campo,
                                        )}
                                        required={
                                            field.obrigatorio
                                        }
                                        value={String(
                                            value ?? "",
                                        )}
                                        onChange={(
                                            next,
                                        ) =>
                                            onCustomField(
                                                field.campo,
                                                next,
                                            )
                                        }
                                    >
                                        <option value="">
                                            Selecionar...
                                        </option>

                                        {options.map(
                                            (
                                                option,
                                                index,
                                            ) => (
                                                <option
                                                    key={
                                                        index
                                                    }
                                                    value={String(
                                                        option,
                                                    )}
                                                >
                                                    {String(
                                                        option,
                                                    )}
                                                </option>
                                            ),
                                        )}
                                    </SelectField>
                                );
                            }

                            return (
                                <InputField
                                    key={field.campo}
                                    label={fieldLabel(
                                        field.campo,
                                    )}
                                    required={
                                        field.obrigatorio
                                    }
                                    type={inputType(
                                        field.tipo,
                                    )}
                                    value={String(
                                        value ?? "",
                                    )}
                                    onChange={(next) =>
                                        onCustomField(
                                            field.campo,
                                            next,
                                        )
                                    }
                                />
                            );
                        })}
                    </div>
                </section>
            )}

            {type.campos_configuracao.some(
                (field) =>
                    field.origem ===
                    "automatico",
            ) && (
                <section className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <p className="text-sm font-medium text-blue-900">
                        Campos automáticos
                    </p>

                    <p className="mt-1 text-xs text-blue-700">
                        Os restantes campos configurados são preenchidos
                        automaticamente com os dados das entidades
                        selecionadas.
                    </p>
                </section>
            )}
        </div>
    );
}

function inputType(
    value: string | null | undefined,
): string {
    const type =
        value?.toLowerCase() ?? "text";

    return [
        "date",
        "email",
        "number",
        "tel",
    ].includes(type)
        ? type
        : "text";
}

function InputField({
    label,
    value,
    type = "text",
    required = false,
    onChange,
}: {
    label: string;
    value: string;
    type?: string;
    required?: boolean;
    onChange: (value: string) => void;
}) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
                {label}
                {required ? " *" : ""}
            </span>

            <input
                type={type}
                value={value}
                required={required}
                aria-required={required}
                min={
                    type === "number"
                        ? "0"
                        : undefined
                }
                step={
                    type === "number"
                        ? "0.01"
                        : undefined
                }
                onChange={(event) =>
                    onChange(event.target.value)
                }
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            />
        </label>
    );
}

function SelectField({
    label,
    value,
    required = false,
    onChange,
    children,
}: {
    label: string;
    value: string;
    required?: boolean;
    onChange: (value: string) => void;
    children: ReactNode;
}) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
                {label}
                {required ? " *" : ""}
            </span>

            <select
                value={value}
                required={required}
                aria-required={required}
                onChange={(event) =>
                    onChange(event.target.value)
                }
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            >
                {children}
            </select>
        </label>
    );
}
