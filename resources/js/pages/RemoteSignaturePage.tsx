import axios from 'axios';
import {
    ReactNode,
    useState,
} from 'react';
import {
    useParams,
} from 'react-router-dom';
import {
    AlertCircle,
    CheckCircle2,
    FileSignature,
    LoaderCircle,
    ShieldCheck,
} from 'lucide-react';
import {
    useQuery,
} from '@tanstack/react-query';
import api from '../lib/api';
import SignaturePad from '../components/checklists/SignaturePad';

interface RemoteSignaturePreview {
    assinatura: {
        id: string;
        signatario_tipo: string;
        signatario_nome: string | null;
        signatario_email: string;
        placeholder: string;
        status: string;
        verificado: boolean;
        solicitado_em: string | null;
        otp_expira_em: string | null;
        expirado: boolean;
    };

    contrato: {
        id: string;
        tipo: string;
        status: string;
        data_inicio: string | null;
        data_fim: string | null;
        valor_diaria: string | number | null;
        valor_semanal: string | number | null;
        valor_caucao: string | number | null;
        valor_total: string | number | null;
        campos_preenchidos: Record<
            string,
            unknown
        >;
        versao_atual: number;
    };

    template: {
        nome: string;
        conteudo_original: string | null;
        campos_detectados: unknown[];
        campos_mapeados: Record<
            string,
            unknown
        >;
    } | null;

    empresa: {
        nome_empresa: string;
        nif: string | null;
        email: string | null;
        telemovel: string | null;
        nome_gerente: string | null;
    } | null;

    motorista: Record<
        string,
        unknown
    > | null;

    proprietario: Record<
        string,
        unknown
    > | null;

    veiculo: Record<
        string,
        unknown
    > | null;
}

function apiError(
    error: unknown
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
                        (value) =>
                            typeof value ===
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
            'Não foi possível concluir a assinatura.'
        );
    }

    return 'Não foi possível concluir a assinatura.';
}

export default function RemoteSignaturePage() {
    const {
        token,
    } = useParams<{
        token: string;
    }>();

    const [
        otp,
        setOtp,
    ] = useState('');

    const [
        signature,
        setSignature,
    ] = useState('');

    const [
        accepted,
        setAccepted,
    ] = useState(false);

    const [
        submitting,
        setSubmitting,
    ] = useState(false);

    const [
        completed,
        setCompleted,
    ] = useState(false);

    const [
        error,
        setError,
    ] =
        useState<string | null>(
            null
        );

    const previewQuery =
        useQuery({
            queryKey: [
                'remote-signature',
                token,
            ],

            enabled:
                Boolean(
                    token
                ),

            retry: false,

            queryFn:
                async () => {
                    const response =
                        await api.get(
                            `/api/assinaturas/remotas/${token}`
                        );

                    return response
                        .data
                        .data as RemoteSignaturePreview;
                },
        });

    async function submit() {
        if (
            otp.length !==
            6
        ) {
            setError(
                'Introduza o código de 6 dígitos enviado por e-mail.'
            );

            return;
        }

        if (!accepted) {
            setError(
                'É necessário aceitar os termos antes de assinar.'
            );

            return;
        }

        if (!signature) {
            setError(
                'Preencha a assinatura.'
            );

            return;
        }

        setSubmitting(
            true
        );

        setError(
            null
        );

        try {
            await api.post(
                `/api/assinaturas/remotas/${token}/confirmar`,
                {
                    codigo_otp:
                        otp,

                    aceite:
                        true,

                    assinatura:
                        signature,
                }
            );

            setCompleted(
                true
            );
        } catch (
            requestError
        ) {
            setError(
                apiError(
                    requestError
                )
            );
        } finally {
            setSubmitting(
                false
            );
        }
    }

    if (
        previewQuery.isLoading
    ) {
        return (
            <PublicShell>
                <LoaderCircle className="h-9 w-9 animate-spin text-indigo-600" />
            </PublicShell>
        );
    }

    if (
        previewQuery.isError ||
        !previewQuery.data
    ) {
        return (
            <PublicShell>
                <div className="max-w-md text-center">
                    <AlertCircle className="mx-auto h-12 w-12 text-red-500" />

                    <h1 className="mt-4 text-xl font-bold text-slate-950">
                        Solicitação inválida
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        Este link de assinatura não existe, expirou ou já foi utilizado.
                    </p>
                </div>
            </PublicShell>
        );
    }

    if (completed) {
        return (
            <PublicShell>
                <div className="max-w-md text-center">
                    <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />

                    <h1 className="mt-5 text-2xl font-bold text-slate-950">
                        Assinatura concluída
                    </h1>

                    <p className="mt-2 text-slate-500">
                        A sua assinatura foi registada com sucesso.
                    </p>

                    <p className="mt-4 text-sm text-slate-400">
                        Pode fechar esta página.
                    </p>
                </div>
            </PublicShell>
        );
    }

    const data =
        previewQuery.data;

    if (
        data.assinatura.expirado
    ) {
        return (
            <PublicShell>
                <div className="max-w-md text-center">
                    <AlertCircle className="mx-auto h-12 w-12 text-amber-500" />

                    <h1 className="mt-4 text-xl font-bold text-slate-950">
                        Código expirado
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        Solicite ao responsável pelo contrato o reenvio da assinatura.
                    </p>
                </div>
            </PublicShell>
        );
    }

    return (
        <PublicShell>
            <div className="w-full max-w-4xl">
                <div className="mb-7 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                        <FileSignature className="h-6 w-6" />
                    </div>

                    <h1 className="mt-4 text-2xl font-bold text-slate-950">
                        Assinatura de contrato
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        {data.template
                            ?.nome ??
                            'Contrato'}
                    </p>
                </div>

                {error && (
                    <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                    <div className="space-y-5">
                        <section className="rounded-2xl border border-slate-200 bg-white p-5">
                            <h2 className="font-semibold text-slate-900">
                                Dados da solicitação
                            </h2>

                            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                <Info
                                    label="Signatário"
                                    value={
                                        data.assinatura
                                            .signatario_nome ??
                                        '—'
                                    }
                                />

                                <Info
                                    label="E-mail"
                                    value={
                                        data.assinatura
                                            .signatario_email
                                    }
                                />

                                <Info
                                    label="Início"
                                    value={dateLabel(
                                        data.contrato
                                            .data_inicio
                                    )}
                                />

                                <Info
                                    label="Fim"
                                    value={dateLabel(
                                        data.contrato
                                            .data_fim
                                    )}
                                />
                            </div>
                        </section>

                        {data.template
                            ?.conteudo_original && (
                            <section className="rounded-2xl border border-slate-200 bg-white p-5">
                                <h2 className="font-semibold text-slate-900">
                                    Documento
                                </h2>

                                <div className="mt-4 max-h-[420px] overflow-y-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                                    {
                                        data.template
                                            .conteudo_original
                                    }
                                </div>
                            </section>
                        )}
                    </div>

                    <div className="space-y-5">
                        <section className="rounded-2xl border border-slate-200 bg-white p-5">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5 text-indigo-600" />

                                <h2 className="font-semibold text-slate-900">
                                    Confirmar identidade
                                </h2>
                            </div>

                            <label className="mt-5 block text-sm font-medium text-slate-700">
                                Código recebido por e-mail
                            </label>

                            <input
                                value={
                                    otp
                                }
                                inputMode="numeric"
                                maxLength={
                                    6
                                }
                                onChange={(
                                    event
                                ) =>
                                    setOtp(
                                        event.target.value
                                            .replace(
                                                /\D/g,
                                                ''
                                            )
                                            .slice(
                                                0,
                                                6
                                            )
                                    )
                                }
                                className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-center text-xl font-bold tracking-[0.35em] outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                            />

                            <p className="mt-2 text-xs text-slate-400">
                                O código possui 6 dígitos.
                            </p>
                        </section>

                        <section className="rounded-2xl border border-slate-200 bg-white p-5">
                            <SignaturePad
                                label="A sua assinatura"
                                onChange={
                                    setSignature
                                }
                                disabled={
                                    submitting
                                }
                            />
                        </section>

                        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
                            <input
                                type="checkbox"
                                checked={
                                    accepted
                                }
                                onChange={(
                                    event
                                ) =>
                                    setAccepted(
                                        event.target
                                            .checked
                                    )
                                }
                                className="mt-1"
                            />

                            <span className="text-sm leading-6 text-slate-600">
                                Confirmo que li o documento e aceito registar esta assinatura eletronicamente.
                            </span>
                        </label>

                        <button
                            type="button"
                            disabled={
                                submitting
                            }
                            onClick={
                                submit
                            }
                            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 font-semibold text-white disabled:opacity-50"
                        >
                            {submitting && (
                                <LoaderCircle className="h-5 w-5 animate-spin" />
                            )}

                            Assinar contrato
                        </button>
                    </div>
                </div>
            </div>
        </PublicShell>
    );
}

function PublicShell({
    children,
}: {
    children:
        ReactNode;
}) {
    return (
        <div className="min-h-screen bg-slate-50 px-4 py-10">
            <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
                {children}
            </div>
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
