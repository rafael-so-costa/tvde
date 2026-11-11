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
    ContractWizardSignatures,
    TipoContrato,
} from "../../../types/tipo-contrato";
import type {
    Veiculo,
} from "../../../types/veiculo";
import type { ReactNode } from "react";
import { isRgpdType, rgpdDecisions } from "./ContractRgpdFields";

interface Props {
    type: TipoContrato;
    form: ContractWizardForm;
    signatures: ContractWizardSignatures;

    empresa?: Empresa;
    motorista?: Motorista;
    proprietario?: Proprietario;
    veiculo?: Veiculo;
}

export default function ContractReviewStep({
    type,
    form,
    signatures,
    empresa,
    motorista,
    proprietario,
    veiculo,
}: Props) {
    const activeSignatures =
        Object.values(signatures).filter(
            (item) => item?.enabled,
        );

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-slate-950">
                    Rever contrato
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                    Confirme a configuração antes de criar o contrato.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card title="Tipo">
                    <Value
                        label="Contrato"
                        value={type.nome}
                    />

                    <Value
                        label="Template"
                        value={
                            type.template?.nome ??
                            "Sem template"
                        }
                    />

                    <Value
                        label="Workflow"
                        value={
                            type
                                .checklist_process_template
                                ?.nome ??
                            "Sem workflow"
                        }
                    />
                </Card>

                <Card title="Entidades">
                    <Value
                        label="Empresa"
                        value={
                            empresa?.nome_empresa ??
                            "—"
                        }
                    />

                    <Value
                        label="Motorista"
                        value={
                            motorista?.nome_completo ??
                            "—"
                        }
                    />

                    <Value
                        label="Proprietário"
                        value={
                            proprietario?.nome_empresa ??
                            proprietario?.nome_completo ??
                            "—"
                        }
                    />

                    <Value
                        label="Veículo"
                        value={
                            veiculo
                                ? `${veiculo.matricula} — ${veiculo.marca} ${veiculo.modelo}`
                                : "—"
                        }
                    />
                </Card>

                {isRgpdType(type) ? (
                    <Card title="Autorizações específicas (RGPD)">
                        <Value
                            label="Qualidade do titular"
                            value={String(
                                form.campos_preenchidos.RGPD_TITULAR_TIPO ??
                                "—"
                            )}
                        />

                        <Value
                            label="Titular"
                            value={
                                signatures.ASSINATURA_TITULAR
                                    ?.signatario_nome || "—"
                            }
                        />

                        {rgpdDecisions.map((decision) => (
                            <Value
                                key={decision.key}
                                label={decision.label}
                                value={rgpdChoiceLabel(
                                    decision.key,
                                    form.campos_preenchidos[
                                        decision.key
                                    ],
                                )}
                            />
                        ))}
                    </Card>
                ) : (
                <Card title="Condições">
                    <Value
                        label="Início"
                        value={
                            form.data_inicio ||
                            "—"
                        }
                    />

                    <Value
                        label="Fim"
                        value={
                            form.data_fim ||
                            "—"
                        }
                    />

                    <Value
                        label="Valor diário"
                        value={money(
                            form.valor_diaria,
                        )}
                    />

                    <Value
                        label="Caução"
                        value={money(
                            form.valor_caucao,
                        )}
                    />

                    <Value
                        label="Valor total"
                        value={money(
                            form.valor_total,
                        )}
                    />
                </Card>
                )}

                <Card title="Assinaturas">
                    <Value
                        label="Configuradas"
                        value={String(
                            activeSignatures.length,
                        )}
                    />

                    {activeSignatures.map(
                        (signature, index) =>
                            signature ? (
                                <div
                                    key={`${signature.modo}-${index}`}
                                    className="rounded-xl border border-slate-200 p-3"
                                >
                                    <p className="text-sm font-medium text-slate-700">
                                        {signature.signatario_nome || `Assinatura ${index + 1}`}
                                    </p>

                                    <p className="mt-1 text-xs text-slate-500">
                                        {signature.modo === "presencial"
                                            ? "Assinatura presencial"
                                            : "Assinatura remota"}
                                    </p>

                                    {signature.modo === "presencial" &&
                                        /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(
                                            signature.assinatura_url,
                                        ) && (
                                            <img
                                                src={signature.assinatura_url}
                                                alt="Imagem da assinatura"
                                                className="mt-3 h-20 max-w-full object-contain"
                                            />
                                        )}
                                </div>
                            ) : null,
                    )}
                </Card>
            </div>

            {!isRgpdType(type) && Object.keys(
                form.campos_preenchidos,
            ).length > 0 && (
                <Card title="Campos preenchidos">
                    {Object.entries(
                        form.campos_preenchidos,
                    )
                        .filter(
                            ([key]) => !key.toUpperCase().startsWith("ASSINATURA_"),
                        )
                        .map(
                        ([key, value]) => (
                            <Value
                                key={key}
                                label={key}
                                value={String(
                                    value ??
                                        "—",
                                )}
                            />
                        ),
                    )}
                </Card>
            )}
        </div>
    );
}

function Card({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h4 className="font-semibold text-slate-900">
                {title}
            </h4>

            <div className="mt-4 space-y-3">
                {children}
            </div>
        </div>
    );
}

function Value({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="flex justify-between gap-4 text-sm">
            <span className="text-slate-500">
                {label}
            </span>

            <span className="text-right font-medium text-slate-800">
                {value}
            </span>
        </div>
    );
}

function rgpdChoiceLabel(
    key: string,
    value: unknown,
): string {
    const choice = String(value ?? "");

    if (choice === "nao_aplicavel") {
        return "Não aplicável";
    }

    if (key === "RGPD_DECISAO_SENSIVEIS") {
        if (choice === "autorizo") {
            return "Presto consentimento explícito";
        }

        if (choice === "nao_autorizo") {
            return "Não presto consentimento";
        }
    }

    if (choice === "autorizo") {
        return "Autorizo";
    }

    if (choice === "nao_autorizo") {
        return "Não autorizo";
    }

    return "Por responder";
}

function money(value: string): string {
    if (!value.trim()) {
        return "—";
    }

    return new Intl.NumberFormat(
        "pt-PT",
        {
            style: "currency",
            currency: "EUR",
        },
    ).format(Number(value));
}
