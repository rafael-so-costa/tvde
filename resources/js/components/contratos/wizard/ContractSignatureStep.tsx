import {
    AlertTriangle,
    Mail,
} from "lucide-react";
import SignaturePad from "../../checklists/SignaturePad";
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
    ContractWizardSignatures,
    TipoContrato,
    TipoContratoAssinaturaConfiguracao,
} from "../../../types/tipo-contrato";
import type {
    SignaturePlaceholder,
} from "../../../types/template";

interface Props {
    type: TipoContrato;
    signatures: ContractWizardSignatures;
    titularTipo?: string;

    empresa?: Empresa;
    motorista?: Motorista;
    proprietario?: Proprietario;

    onChange: (
        placeholder: SignaturePlaceholder,
        values: Partial<
            NonNullable<
                ContractWizardSignatures[
                    SignaturePlaceholder
                ]
            >
        >,
    ) => void;
}

const labels: Record<
    SignaturePlaceholder,
    string
> = {
    ASSINATURA_MOTORISTA:
        "Motorista",

    ASSINATURA_PROPRIETARIO:
        "Proprietário",

    ASSINATURA_EMPRESA:
        "Empresa",

    ASSINATURA_TESTEMUNHA:
        "Testemunha",

    ASSINATURA_TITULAR:
        "Titular dos dados",
};

export default function ContractSignatureStep({
    type,
    signatures,
    titularTipo,
    empresa,
    motorista,
    proprietario,
    onChange,
}: Props) {
    if (
        type.assinaturas_configuracao.length ===
        0
    ) {
        return (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
                <h3 className="font-semibold text-emerald-900">
                    Este contrato não exige assinatura na criação
                </h3>

                <p className="mt-2 text-sm text-emerald-700">
                    Pode avançar diretamente para a revisão.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div>
                <h3 className="text-lg font-semibold text-slate-950">
                    Assinaturas
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                    Cada assinatura segue as regras configuradas para
                    este tipo de contrato.
                </p>
            </div>

            {type.assinaturas_configuracao.map(
                (config) => (
                    <SignatureCard
                        key={
                            config.placeholder
                        }
                        config={config}
                        state={
                            signatures[
                                config.placeholder
                            ]
                        }
                        titularTipo={titularTipo}
                        targetEmail={emailFor(
                            config.placeholder,
                            empresa,
                            motorista,
                            proprietario,
                        )}
                        onChange={(values) =>
                            onChange(
                                config.placeholder,
                                values,
                            )
                        }
                    />
                ),
            )}
        </div>
    );
}

function SignatureCard({
    config,
    state,
    targetEmail,
    titularTipo,
    onChange,
}: {
    config: TipoContratoAssinaturaConfiguracao;
    state:
        | ContractWizardSignatures[
              SignaturePlaceholder
          ]
        | undefined;
    targetEmail: string | null;
    titularTipo?: string;
    onChange: (
        values: Partial<
            NonNullable<
                ContractWizardSignatures[
                    SignaturePlaceholder
                ]
            >
        >,
    ) => void;
}) {
    if (!state) {
        return null;
    }

    const active =
        config.obrigatoria ||
        state.enabled;

    return (
        <div
            className={[
                "rounded-2xl border p-5",
                active
                    ? "border-slate-200 bg-white"
                    : "border-slate-200 bg-slate-50",
            ].join(" ")}
        >
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                    <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-900">
                            {
                                labels[
                                    config
                                        .placeholder
                                ]
                            }
                        </h4>

                        {config.obrigatoria && (
                            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600">
                                Obrigatória
                            </span>
                        )}
                    </div>

                    <p className="mt-1 text-xs text-slate-500">
                        {
                            config
                                .placeholder
                        }
                    </p>
                </div>

                {!config.obrigatoria && (
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                        <input
                            type="checkbox"
                            checked={
                                state.enabled
                            }
                            onChange={(
                                event,
                            ) =>
                                onChange({
                                    enabled:
                                        event
                                            .target
                                            .checked,
                                })
                            }
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                        />

                        Incluir assinatura
                    </label>
                )}
            </div>

            {active && (
                <div className="mt-5 space-y-5">
                    <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-700">
                            Forma de assinatura
                        </span>

                        <select
                            value={
                                state.modo
                            }
                            onChange={(
                                event,
                            ) =>
                                onChange({
                                    modo:
                                        event
                                            .target
                                            .value as
                                            | "presencial"
                                            | "remota",

                                    assinatura_url:
                                        "",
                                })
                            }
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                        >
                            {config.modos
                                .filter((mode) => !(config.placeholder === "ASSINATURA_TITULAR" && titularTipo === "outro" && mode === "remota"))
                                .map(
                                (mode) => (
                                    <option
                                        key={
                                            mode
                                        }
                                        value={
                                            mode
                                        }
                                    >
                                        {mode ===
                                        "presencial"
                                            ? "Presencial"
                                            : "Remota"}
                                    </option>
                                ),
                            )}
                        </select>
                    </label>

                    {(config.placeholder ===
                        "ASSINATURA_TESTEMUNHA" ||
                        config.placeholder ===
                        "ASSINATURA_TITULAR") && (
                        <div className="grid gap-4 md:grid-cols-2">
                            <label>
                                <span className="mb-2 block text-sm font-medium text-slate-700">
                                    {config.placeholder === "ASSINATURA_TITULAR"
                                        ? "Nome do titular *"
                                        : "Nome da testemunha *"}
                                </span>

                                <input
                                    value={
                                        state.signatario_nome
                                    }
                                    readOnly={config.placeholder === "ASSINATURA_TITULAR"}
                                    onChange={(
                                        event,
                                    ) =>
                                        onChange({
                                            signatario_nome:
                                                event
                                                    .target
                                                    .value,
                                        })
                                    }
                                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                                />
                            </label>

                            {state.modo ===
                                "remota" && (
                                <label>
                                    <span className="mb-2 block text-sm font-medium text-slate-700">
                                        E-mail *
                                    </span>

                                    <input
                                        type="email"
                                        value={
                                            state.signatario_email
                                        }
                                        readOnly={config.placeholder === "ASSINATURA_TITULAR"}
                                        onChange={(
                                            event,
                                        ) =>
                                            onChange({
                                                signatario_email:
                                                    event
                                                        .target
                                                        .value,
                                            })
                                        }
                                        className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                                    />
                                </label>
                            )}
                        </div>
                    )}

                    {state.modo ===
                    "presencial" ? (
                        <SignaturePad
                            label={`Assinatura — ${
                                labels[
                                    config
                                        .placeholder
                                ]
                            }`}
                            onChange={(
                                value,
                            ) =>
                                onChange({
                                    assinatura_url:
                                        value,
                                })
                            }
                        />
                    ) : config.placeholder !==
                      "ASSINATURA_TESTEMUNHA" &&
                      config.placeholder !==
                      "ASSINATURA_TITULAR" ? (
                        targetEmail ? (
                            <div className="flex gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
                                <Mail className="h-5 w-5 shrink-0 text-blue-600" />

                                <div>
                                    <p className="text-sm font-medium text-blue-900">
                                        Assinatura remota
                                    </p>

                                    <p className="mt-1 text-xs text-blue-700">
                                        A solicitação será enviada para{" "}
                                        {targetEmail}.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />

                                <p className="text-sm text-amber-800">
                                    O signatário selecionado não possui
                                    e-mail válido.
                                </p>
                            </div>
                        )
                    ) : null}
                </div>
            )}
        </div>
    );
}

function emailFor(
    placeholder: SignaturePlaceholder,
    empresa?: Empresa,
    motorista?: Motorista,
    proprietario?: Proprietario,
): string | null {
    if (
        placeholder ===
        "ASSINATURA_EMPRESA"
    ) {
        return empresa?.email ?? null;
    }

    if (
        placeholder ===
        "ASSINATURA_MOTORISTA"
    ) {
        return motorista?.email ?? null;
    }

    if (
        placeholder ===
        "ASSINATURA_PROPRIETARIO"
    ) {
        return proprietario?.email ?? null;
    }

    return null;
}
