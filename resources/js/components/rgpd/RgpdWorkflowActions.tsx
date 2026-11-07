import { useEffect, useState } from "react";

/*
 * FROTAPRO_4R1051_ADMIN_WORKFLOW_ACTIONS
 *
 * Este componente nao altera diretamente
 * o estado do workflow.
 *
 * Todas as alteracoes dependem de
 * validacao pelo backend Laravel.
 */

type WorkflowStep = {
    codigo: string;
    estado: "concluido" | "pendente";
};

type WorkflowData = {
    estado_registo: string;

    etapas: WorkflowStep[];

    resumo: {
        assinatura_integra: boolean;
        comprovativo_pdf_integro: boolean;
    };
};

type ApiClient = {
    get: (url: string) => Promise<unknown>;

    post: (
        url: string,
        data: {
            referencia: string;
            confirmacao: boolean;
        }
    ) => Promise<unknown>;
};

type Props = {
    api: ApiClient;
    registoId: string;
    workflow: WorkflowData;
    onUpdated: () => void;
};

type Action = "validar" | "conferir";

function errorMessage(error: unknown): string {
    const candidate = error as {
        response?: {
            data?: {
                message?: string;
                errors?: Record<string, string[]>;
            };
        };
    };

    const errors = candidate?.response?.data?.errors;

    if (errors) {
        const first = Object.values(errors)
            .flat()
            .find((message) => typeof message === "string");

        if (first) {
            return first;
        }
    }

    return (
        candidate?.response?.data?.message ||
        "Não foi possível concluir a operação."
    );
}

export default function RgpdWorkflowActions({
    api,
    registoId,
    workflow,
    onUpdated,
}: Props) {
    const [canManage, setCanManage] =
        useState<boolean | null>(null);

    const [busy, setBusy] = useState(false);

    const [referenceValidation, setReferenceValidation] =
        useState("");

    const [referenceReview, setReferenceReview] =
        useState("");

    const [acceptValidation, setAcceptValidation] =
        useState(false);

    const [acceptReview, setAcceptReview] =
        useState(false);

    const [error, setError] = useState("");

    const [notice, setNotice] = useState("");

    useEffect(() => {
        let active = true;

        setCanManage(null);
        setError("");
        setNotice("");
        setReferenceValidation("");
        setReferenceReview("");
        setAcceptValidation(false);
        setAcceptReview(false);

        if (!registoId) {
            setCanManage(false);
            return;
        }

        /*
         * O endpoint so devolve 200
         * a utilizadores com permissao
         * templates/configurar.
         */
        void api
            .get(
                `/api/rgpd/${encodeURIComponent(registoId)}/workflow/capacidades`
            )
            .then(() => {
                if (active) {
                    setCanManage(true);
                }
            })
            .catch(() => {
                if (active) {
                    setCanManage(false);
                }
            });

        return () => {
            active = false;
        };
    }, [api, registoId]);

    const complete = (code: string): boolean =>
        workflow.etapas.some(
            (step) =>
                step.codigo === code &&
                step.estado === "concluido"
        );

    const validationCompleted =
        complete("validar_informacao");

    const reviewCompleted =
        complete("conferencia_rgpd");

    const canValidate =
        workflow.estado_registo === "rascunho" &&
        complete("identificar_titular") &&
        complete("gerar_documento_rgpd") &&
        complete("registar_autorizacoes") &&
        !validationCompleted;

    const requiredForReview = [
        "identificar_titular",
        "validar_informacao",
        "gerar_documento_rgpd",
        "comprovar_disponibilizacao",
        "registar_autorizacoes",
        "comprovar_assinatura_titular",
    ];

    const canReview =
        !reviewCompleted &&
        requiredForReview.every(complete) &&
        workflow.resumo.assinatura_integra &&
        workflow.resumo.comprovativo_pdf_integro;

    async function submit(action: Action): Promise<void> {
        if (busy || !registoId) {
            return;
        }

        const reference =
            action === "validar"
                ? referenceValidation.trim()
                : referenceReview.trim();

        const confirmed =
            action === "validar"
                ? acceptValidation
                : acceptReview;

        if (reference.length < 10 || reference.length > 500) {
            setError(
                "A referência deve conter entre 10 e 500 caracteres."
            );
            return;
        }

        if (!confirmed) {
            setError(
                "É necessário confirmar expressamente esta operação."
            );
            return;
        }

        if (
            (action === "validar" && !canValidate) ||
            (action === "conferir" && !canReview)
        ) {
            setError(
                "Existem etapas obrigatórias ainda pendentes."
            );
            return;
        }

        setBusy(true);
        setError("");
        setNotice("");

        try {
            await api.post(
                `/api/rgpd/${encodeURIComponent(registoId)}/workflow/${action}`,
                {
                    referencia: reference,
                    confirmacao: true,
                }
            );

            setNotice(
                action === "validar"
                    ? "Validação registada com evidência auditável."
                    : "Conferência final registada com evidência auditável."
            );

            if (action === "validar") {
                setReferenceValidation("");
                setAcceptValidation(false);
            } else {
                setReferenceReview("");
                setAcceptReview(false);
            }

            onUpdated();
        } catch (failure: unknown) {
            setError(errorMessage(failure));
        } finally {
            setBusy(false);
        }
    }

    /*
     * A ausencia de permissao de gestao
     * oculta totalmente as operacoes.
     */
    if (canManage !== true) {
        return null;
    }

    return (
        <section className="space-y-4 border-t border-slate-200 pt-5">
            <div className="space-y-1">
                <h3 className="font-semibold text-slate-950">
                    Validação e conferência RGPD
                </h3>

                <p className="text-xs text-slate-500">
                    As ações abaixo exigem autenticação,
                    permissão administrativa e evidências
                    verificáveis no servidor.
                </p>
            </div>

            {error && (
                <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                >
                    {error}
                </div>
            )}

            {notice && (
                <div
                    role="status"
                    className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
                >
                    {notice}
                </div>
            )}

            <form
                className="space-y-3 rounded-xl border border-slate-200 p-4"
                onSubmit={(event) => {
                    event.preventDefault();
                    void submit("validar");
                }}
            >
                <div className="flex items-center justify-between gap-3">
                    <h4 className="font-semibold text-slate-900">
                        1. Validar informação
                    </h4>

                    <span className="text-xs text-slate-500">
                        {validationCompleted
                            ? "Concluída"
                            : "Pendente"}
                    </span>
                </div>

                <p className="text-sm text-slate-600">
                    Verifique a identificação do titular,
                    o modelo documental, as finalidades
                    e as quatro escolhas antes de validar.
                </p>

                {validationCompleted ? (
                    <p className="text-sm text-emerald-700">
                        A validação já possui evidência registada.
                    </p>
                ) : (
                    <>
                        <label className="block space-y-1">
                            <span className="text-sm font-medium text-slate-800">
                                Referência da validação
                            </span>

                            <input
                                type="text"
                                value={referenceValidation}
                                onChange={(event) =>
                                    setReferenceValidation(event.target.value)
                                }
                                maxLength={500}
                                placeholder="Ex.: RGPD-VALIDACAO-INTERNA-001"
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                disabled={!canValidate || busy}
                            />
                        </label>

                        <label className="flex items-start gap-2 text-sm text-slate-700">
                            <input
                                type="checkbox"
                                checked={acceptValidation}
                                onChange={(event) =>
                                    setAcceptValidation(event.target.checked)
                                }
                                disabled={!canValidate || busy}
                                className="mt-1"
                            />

                            <span>
                                Confirmo que efetuei a validação
                                documental e assumo a autoria
                                deste registo de auditoria.
                            </span>
                        </label>

                        {!canValidate && (
                            <p className="text-xs text-amber-700">
                                A validação só está disponível
                                num rascunho com identificação,
                                snapshot e escolhas completos.
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={
                                busy ||
                                !canValidate ||
                                !acceptValidation ||
                                referenceValidation.trim().length < 10
                            }
                            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {busy
                                ? "A guardar..."
                                : "Registar validação"}
                        </button>
                    </>
                )}
            </form>

            <form
                className="space-y-3 rounded-xl border border-slate-200 p-4"
                onSubmit={(event) => {
                    event.preventDefault();
                    void submit("conferir");
                }}
            >
                <div className="flex items-center justify-between gap-3">
                    <h4 className="font-semibold text-slate-900">
                        2. Conferência final
                    </h4>

                    <span className="text-xs text-slate-500">
                        {reviewCompleted
                            ? "Concluída"
                            : "Pendente"}
                    </span>
                </div>

                <p className="text-sm text-slate-600">
                    Exige as seis etapas anteriores,
                    assinatura íntegra, comprovativo PDF
                    íntegro e responsável diferente de
                    quem efetuou a validação inicial.
                </p>

                {reviewCompleted ? (
                    <p className="text-sm text-emerald-700">
                        A conferência final já foi registada.
                    </p>
                ) : (
                    <>
                        <label className="block space-y-1">
                            <span className="text-sm font-medium text-slate-800">
                                Referência da conferência
                            </span>

                            <input
                                type="text"
                                value={referenceReview}
                                onChange={(event) =>
                                    setReferenceReview(event.target.value)
                                }
                                maxLength={500}
                                placeholder="Ex.: RGPD-CONFERENCIA-INTERNA-001"
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                disabled={!canReview || busy}
                            />
                        </label>

                        <label className="flex items-start gap-2 text-sm text-slate-700">
                            <input
                                type="checkbox"
                                checked={acceptReview}
                                onChange={(event) =>
                                    setAcceptReview(event.target.checked)
                                }
                                disabled={!canReview || busy}
                                className="mt-1"
                            />

                            <span>
                                Confirmo a conferência
                                das evidências e declaro
                                ser responsável diferente
                                do validador inicial.
                            </span>
                        </label>

                        {!canReview && (
                            <p className="text-xs text-amber-700">
                                A conferência será desbloqueada
                                após disponibilização ao titular,
                                assinatura e PDF íntegros.
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={
                                busy ||
                                !canReview ||
                                !acceptReview ||
                                referenceReview.trim().length < 10
                            }
                            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {busy
                                ? "A guardar..."
                                : "Registar conferência"}
                        </button>
                    </>
                )}
            </form>

            <p className="text-xs text-slate-500">
                Estes registos não substituem a confirmação
                de disponibilização pelo próprio titular.
                O backend verifica novamente todas as condições.
            </p>
        </section>
    );
}
