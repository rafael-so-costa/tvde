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

interface Props {
    type: TipoContrato;
    form: ContractWizardForm;

    empresas: Empresa[];
    proprietarios: Proprietario[];
    motoristas: Motorista[];
    veiculos: Veiculo[];

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

function manualFields(
    type: TipoContrato,
): TipoContratoCampoConfiguracao[] {
    return type.campos_configuracao.filter(
        (field) =>
            field.origem === "manual" &&
            !standardFields.has(
                field.campo.trim().toUpperCase(),
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
    onField,
    onCustomField,
    onVehicle,
}: Props) {
    const showEmpresa =
        Boolean(type.entidades.empresa) ||
        signatureRequires(
            type,
            "ASSINATURA_EMPRESA",
        );

    const showProprietario =
        Boolean(type.entidades.proprietario) ||
        signatureRequires(
            type,
            "ASSINATURA_PROPRIETARIO",
        );

    const showMotorista =
        Boolean(type.entidades.motorista) ||
        signatureRequires(
            type,
            "ASSINATURA_MOTORISTA",
        );

    const showVeiculo =
        Boolean(type.entidades.veiculo);

    const fields =
        manualFields(type);

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
                            required={Boolean(
                                type.entidades.empresa,
                            )}
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
                                Boolean(
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
                                Boolean(
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

            <section className="border-t border-slate-200 pt-7">
                <h3 className="text-lg font-semibold text-slate-950">
                    Condições
                </h3>

                <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <InputField
                        label="Data de início"
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
                        type="date"
                        value={form.data_fim}
                        onChange={(value) =>
                            onField(
                                "data_fim",
                                value,
                            )
                        }
                    />

                    <InputField
                        label="Valor diário"
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
            </section>

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
