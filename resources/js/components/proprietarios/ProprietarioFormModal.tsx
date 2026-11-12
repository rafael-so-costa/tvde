import axios from 'axios';
import InternationalPhoneInput from '../InternationalPhoneInput';
import {
    FormEvent,
    useEffect,
    useState,
} from 'react';
import {
    Building2,
    LoaderCircle,
    UserRound,
    X,
} from 'lucide-react';
import type {
    EstadoCivil,
    Proprietario,
    ProprietarioPayload,
    ProprietarioTipo,
    TipoDocumento,
} from '../../types/proprietario';

interface Props {
    open: boolean;
    proprietario: Proprietario | null;
    onClose: () => void;
    onSubmit: (
        payload: ProprietarioPayload
    ) => Promise<void>;
}

interface FormState {
    tipo: ProprietarioTipo;
    nome_completo: string;
    nome_empresa: string;
    nif: string;
    email: string;
    telemovel: string;
    data_nascimento: string;
    filhos: string;
    estado_civil: EstadoCivil | '';
    tipo_documento: TipoDocumento | '';
    numero_documento: string;
    documento_valid_until: string;
    iban: string;
    certidao_permanente: string;
    certidao_valid_until: string;
    certificado_tvde: string;
    certificado_tvde_valid_until: string;
    capital_social: string;
    nome_gerente: string;
    endereco_rua: string;
    endereco_numero: string;
    endereco_complemento: string;
    endereco_cidade: string;
    endereco_cep: string;
    foto_perfil_url: string;
    cartao_frota: string;
}

const emptyForm: FormState = {
    tipo: 'pessoa_fisica',
    nome_completo: '',
    nome_empresa: '',
    nif: '',
    email: '',
    telemovel: '',
    data_nascimento: '',
    filhos: '0',
    estado_civil: '',
    tipo_documento: '',
    numero_documento: '',
    documento_valid_until: '',
    iban: '',
    certidao_permanente: '',
    certidao_valid_until: '',
    certificado_tvde: '',
    certificado_tvde_valid_until: '',
    capital_social: '',
    nome_gerente: '',
    endereco_rua: '',
    endereco_numero: '',
    endereco_complemento: '',
    endereco_cidade: '',
    endereco_cep: '',
    foto_perfil_url: '',
    cartao_frota: '',
};

function nullable(
    value: string
): string | null {
    const normalized =
        value.trim();

    return normalized === ''
        ? null
        : normalized;
}

function dateValue(
    value: string | null
): string {
    return value
        ? value.slice(0, 10)
        : '';
}

export default function ProprietarioFormModal({
    open,
    proprietario,
    onClose,
    onSubmit,
}: Props) {
    const [form, setForm] =
        useState<FormState>(
            emptyForm
        );

    const [errors, setErrors] =
        useState<
            Record<string, string[]>
        >({});

    const [
        generalError,
        setGeneralError,
    ] = useState('');

    const [
        submitting,
        setSubmitting,
    ] = useState(false);

    useEffect(() => {
        if (!open) {
            return;
        }

        setErrors({});
        setGeneralError('');

        if (!proprietario) {
            setForm(emptyForm);
            return;
        }

        setForm({
            tipo:
                proprietario.tipo,
            nome_completo:
                proprietario.nome_completo ??
                '',
            nome_empresa:
                proprietario.nome_empresa ??
                '',
            nif:
                proprietario.nif ?? '',
            email:
                proprietario.email ?? '',
            telemovel:
                proprietario.telemovel ??
                '',
            data_nascimento:
                dateValue(
                    proprietario.data_nascimento
                ),
            filhos:
                String(
                    proprietario.filhos ??
                    0
                ),
            estado_civil:
                proprietario.estado_civil ??
                '',
            tipo_documento:
                proprietario.tipo_documento ??
                '',
            numero_documento:
                proprietario.numero_documento ??
                '',
            documento_valid_until:
                dateValue(
                    proprietario.documento_valid_until
                ),
            iban:
                proprietario.iban ?? '',
            certidao_permanente:
                proprietario.certidao_permanente ??
                '',
            certidao_valid_until:
                dateValue(
                    proprietario.certidao_valid_until
                ),
            certificado_tvde:
                proprietario.certificado_tvde ??
                '',
            certificado_tvde_valid_until:
                dateValue(
                    proprietario.certificado_tvde_valid_until
                ),
            capital_social:
                proprietario.capital_social ??
                '',
            nome_gerente:
                proprietario.nome_gerente ??
                '',
            endereco_rua:
                proprietario.endereco_rua ??
                '',
            endereco_numero:
                proprietario.endereco_numero ??
                '',
            endereco_complemento:
                proprietario.endereco_complemento ??
                '',
            endereco_cidade:
                proprietario.endereco_cidade ??
                '',
            endereco_cep:
                proprietario.endereco_cep ??
                '',
            foto_perfil_url:
                proprietario.foto_perfil_url ??
                '',
            cartao_frota:
                proprietario.cartao_frota ??
                '',
        });
    }, [
        open,
        proprietario,
    ]);

    if (!open) {
        return null;
    }

    function update<
        K extends keyof FormState
    >(
        field: K,
        value: FormState[K]
    ) {
        setForm((current) => ({
            ...current,
            [field]: value,
        }));

        if (errors[field]) {
            setErrors(
                (current) => ({
                    ...current,
                    [field]: [],
                })
            );
        }
    }

    async function handleSubmit(
        event: FormEvent
    ) {
        event.preventDefault();

        setSubmitting(true);
        setErrors({});
        setGeneralError('');

        const capital =
            form.capital_social.trim();

        const payload: ProprietarioPayload = {
            tipo:
                form.tipo,
            nome_completo:
                form.tipo ===
                'pessoa_fisica'
                    ? nullable(
                          form.nome_completo
                      )
                    : null,
            nome_empresa:
                form.tipo ===
                'empresa'
                    ? nullable(
                          form.nome_empresa
                      )
                    : null,
            nif:
                nullable(form.nif),
            email:
                nullable(form.email),
            telemovel:
                nullable(
                    form.telemovel
                ),
            data_nascimento:
                form.tipo ===
                'pessoa_fisica'
                    ? nullable(
                          form.data_nascimento
                      )
                    : null,
            filhos:
                Number(
                    form.filhos || 0
                ),
            estado_civil:
                form.tipo ===
                    'pessoa_fisica' &&
                form.estado_civil
                    ? form.estado_civil
                    : null,
            tipo_documento:
                form.tipo ===
                    'pessoa_fisica' &&
                form.tipo_documento
                    ? form.tipo_documento
                    : null,
            numero_documento:
                form.tipo ===
                'pessoa_fisica'
                    ? nullable(
                          form.numero_documento
                      )
                    : null,
            documento_valid_until:
                form.tipo ===
                'pessoa_fisica'
                    ? nullable(
                          form.documento_valid_until
                      )
                    : null,
            iban:
                nullable(form.iban),
            certidao_permanente:
                form.tipo ===
                'empresa'
                    ? nullable(
                          form.certidao_permanente
                      )
                    : null,
            certidao_valid_until:
                form.tipo ===
                'empresa'
                    ? nullable(
                          form.certidao_valid_until
                      )
                    : null,
            certificado_tvde:
                form.tipo ===
                'empresa'
                    ? nullable(
                          form.certificado_tvde
                      )
                    : null,
            certificado_tvde_valid_until:
                form.tipo ===
                'empresa'
                    ? nullable(
                          form.certificado_tvde_valid_until
                      )
                    : null,
            capital_social:
                form.tipo ===
                    'empresa' &&
                capital !== ''
                    ? Number(capital)
                    : null,
            nome_gerente:
                form.tipo ===
                'empresa'
                    ? nullable(
                          form.nome_gerente
                      )
                    : null,
            endereco_rua:
                nullable(
                    form.endereco_rua
                ),
            endereco_numero:
                nullable(
                    form.endereco_numero
                ),
            endereco_complemento:
                nullable(
                    form.endereco_complemento
                ),
            endereco_cidade:
                nullable(
                    form.endereco_cidade
                ),
            endereco_cep:
                nullable(
                    form.endereco_cep
                ),
            foto_perfil_url:
                nullable(
                    form.foto_perfil_url
                ),
            cartao_frota:
                nullable(
                    form.cartao_frota
                ),
        };

        try {
            await onSubmit(
                payload
            );
        } catch (error) {
            if (
                axios.isAxiosError(
                    error
                )
            ) {
                const response =
                    error.response?.data;

                const validationErrors =
                    response?.errors ?? {};

                setErrors(
                    validationErrors
                );

                if (
                    Object.keys(
                        validationErrors
                    ).length > 0
                ) {
                    setGeneralError(
                        'Existem dados inválidos. Corrija os campos assinalados.'
                    );

                    focusFirstValidationError(
                        validationErrors
                    );
                } else {
                    setGeneralError(
                        response?.message ??
                            'Não foi possível guardar o proprietário.'
                    );
                }
            } else {
                setGeneralError(
                    'Não foi possível guardar o proprietário.'
                );
            }
        } finally {
            setSubmitting(false);
        }
    }

    const inputClass =
        'w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10';

    const labelClass =
        'block text-sm font-medium text-slate-700 mb-1.5';

    function focusFirstValidationError(
        validationErrors: Record<
            string,
            string[]
        >
    ) {
        const firstField =
            Object.keys(
                validationErrors
            )[0];

        if (!firstField) {
            return;
        }

        requestAnimationFrame(
            () => {
                requestAnimationFrame(
                    () => {
                        const marker =
                            Array.from(
                                document.querySelectorAll<HTMLElement>(
                                    '[data-field-error]'
                                )
                            ).find(
                                (element) =>
                                    element.dataset
                                        .fieldError ===
                                    firstField
                            );

                        const control =
                            marker?.parentElement
                                ?.querySelector<HTMLElement>(
                                    'input, select, textarea'
                                );

                        control?.scrollIntoView(
                            {
                                behavior:
                                    'smooth',
                                block:
                                    'center',
                            }
                        );

                        control?.focus();
                    }
                );
            }
        );
    }

    function fieldError(
        field: keyof FormState
    ) {
        const message =
            errors[field]?.[0];

        return message ? (
            <p
                data-field-error={
                    field
                }
                className="mt-1 text-xs text-red-600"
            >
                {message}
            </p>
        ) : null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
                type="button"
                aria-label="Fechar"
                onClick={onClose}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />

            <div className="relative w-full max-w-5xl max-h-[94vh] overflow-hidden rounded-2xl bg-white shadow-2xl">
                <header className="h-20 px-6 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            {form.tipo ===
                            'empresa' ? (
                                <Building2 className="w-5 h-5" />
                            ) : (
                                <UserRound className="w-5 h-5" />
                            )}
                        </div>

                        <div>
                            <h2 className="font-semibold text-lg text-slate-950">
                                {proprietario
                                    ? 'Editar proprietário'
                                    : 'Novo proprietário'}
                            </h2>

                            <p className="text-sm text-slate-500">
                                Os campos obrigatórios determinam automaticamente o estado do cadastro.
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

                <style>{`
                    .advanced-validation-form div:has(> [data-field-error]) > input,
                    .advanced-validation-form div:has(> [data-field-error]) > select,
                    .advanced-validation-form div:has(> [data-field-error]) > textarea {
                        border-color: rgb(239 68 68);
                    }

                    .advanced-validation-form div:has(> [data-field-error]) > input:focus,
                    .advanced-validation-form div:has(> [data-field-error]) > select:focus,
                    .advanced-validation-form div:has(> [data-field-error]) > textarea:focus {
                        border-color: rgb(239 68 68);
                        box-shadow: 0 0 0 4px rgb(239 68 68 / 0.10);
                    }
                `}</style>

                <form
                    onSubmit={
                        handleSubmit
                    }
                    className="advanced-validation-form overflow-y-auto max-h-[calc(94vh-80px)]"
                >
                    <div className="p-6 space-y-8">
                        {generalError && (
                            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                                {
                                    generalError
                                }
                            </div>
                        )}

                        <section>
                            <h3 className="font-semibold text-slate-900 mb-4">
                                Tipo de proprietário
                            </h3>

                            <div className="grid sm:grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() =>
                                        update(
                                            'tipo',
                                            'pessoa_fisica'
                                        )
                                    }
                                    className={[
                                        'rounded-xl border p-4 text-left transition',
                                        form.tipo ===
                                        'pessoa_fisica'
                                            ? 'border-indigo-500 bg-indigo-50'
                                            : 'border-slate-200',
                                    ].join(
                                        ' '
                                    )}
                                >
                                    <UserRound className="w-5 h-5 mb-2 text-indigo-600" />
                                    <div className="font-semibold">
                                        Pessoa física
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        update(
                                            'tipo',
                                            'empresa'
                                        )
                                    }
                                    className={[
                                        'rounded-xl border p-4 text-left transition',
                                        form.tipo ===
                                        'empresa'
                                            ? 'border-indigo-500 bg-indigo-50'
                                            : 'border-slate-200',
                                    ].join(
                                        ' '
                                    )}
                                >
                                    <Building2 className="w-5 h-5 mb-2 text-indigo-600" />
                                    <div className="font-semibold">
                                        Empresa
                                    </div>
                                </button>
                            </div>
                        </section>

                        <section>
                            <h3 className="font-semibold text-slate-900 mb-4">
                                Identificação
                            </h3>

                            <div className="grid sm:grid-cols-2 gap-4">
                                {form.tipo ===
                                'pessoa_fisica' ? (
                                    <>
                                        <div className="sm:col-span-2">
                                            <label className={labelClass}>
                                                Nome completo *
                                            </label>

                                            <input
                                                value={
                                                    form.nome_completo
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    update(
                                                        'nome_completo',
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                                className={
                                                    inputClass
                                                }
                                                required
                                            />

                                            {fieldError(
                                                'nome_completo'
                                            )}
                                        </div>

                                        <div>
                                            <label className={labelClass}>
                                                Data de nascimento
                                            </label>

                                            <input
                                                type="date"
                                                value={
                                                    form.data_nascimento
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    update(
                                                        'data_nascimento',
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                                className={
                                                    inputClass
                                                }
                                            />
                                        </div>

                                        <div>
                                            <label className={labelClass}>
                                                Estado civil
                                            </label>

                                            <select
                                                value={
                                                    form.estado_civil
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    update(
                                                        'estado_civil',
                                                        event
                                                            .target
                                                            .value as EstadoCivil | ''
                                                    )
                                                }
                                                className={
                                                    inputClass
                                                }
                                            >
                                                <option value="">
                                                    Selecionar
                                                </option>
                                                <option value="solteiro">
                                                    Solteiro
                                                </option>
                                                <option value="casado">
                                                    Casado
                                                </option>
                                                <option value="divorciado">
                                                    Divorciado
                                                </option>
                                                <option value="viuvo">
                                                    Viúvo
                                                </option>
                                                <option value="uniao_facto">
                                                    União de facto
                                                </option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className={labelClass}>
                                                Tipo de documento
                                            </label>

                                            <select
                                                value={
                                                    form.tipo_documento
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    update(
                                                        'tipo_documento',
                                                        event
                                                            .target
                                                            .value as TipoDocumento | ''
                                                    )
                                                }
                                                className={
                                                    inputClass
                                                }
                                            >
                                                <option value="">
                                                    Selecionar
                                                </option>
                                                <option value="cartao_cidadao">
                                                    Cartão de Cidadão
                                                </option>
                                                <option value="titulo_residencia">
                                                    Título de residência
                                                </option>
                                                <option value="passaporte">
                                                    Passaporte
                                                </option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className={labelClass}>
                                                Número do documento
                                            </label>

                                            <input
                                                value={
                                                    form.numero_documento
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    update(
                                                        'numero_documento',
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                                className={
                                                    inputClass
                                                }
                                            />
                                        </div>

                                        <div>
                                            <label className={labelClass}>
                                                Validade do documento
                                            </label>

                                            <input
                                                type="date"
                                                value={
                                                    form.documento_valid_until
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    update(
                                                        'documento_valid_until',
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                                className={
                                                    inputClass
                                                }
                                            />
                                        </div>

                                        <div>
                                            <label className={labelClass}>
                                                Filhos
                                            </label>

                                            <input
                                                type="number"
                                                min="0"
                                                value={
                                                    form.filhos
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    update(
                                                        'filhos',
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                                className={
                                                    inputClass
                                                }
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="sm:col-span-2">
                                            <label className={labelClass}>
                                                Nome da empresa *
                                            </label>

                                            <input
                                                value={
                                                    form.nome_empresa
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    update(
                                                        'nome_empresa',
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                                className={
                                                    inputClass
                                                }
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className={labelClass}>
                                                Nome do gerente
                                            </label>

                                            <input
                                                value={
                                                    form.nome_gerente
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    update(
                                                        'nome_gerente',
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                                className={
                                                    inputClass
                                                }
                                            />
                                        </div>

                                        <div>
                                            <label className={labelClass}>
                                                Capital social
                                            </label>

                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={
                                                    form.capital_social
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    update(
                                                        'capital_social',
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                                className={
                                                    inputClass
                                                }
                                            />
                                        </div>

                                        <div>
                                            <label className={labelClass}>
                                                Certidão permanente
                                            </label>

                                            <input
                                                value={
                                                    form.certidao_permanente
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    update(
                                                        'certidao_permanente',
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                                className={
                                                    inputClass
                                                }
                                            />
                                        </div>

                                        <div>
                                            <label className={labelClass}>
                                                Validade da certidão
                                            </label>

                                            <input
                                                type="date"
                                                value={
                                                    form.certidao_valid_until
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    update(
                                                        'certidao_valid_until',
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                                className={
                                                    inputClass
                                                }
                                            />
                                        </div>

                                        <div>
                                            <label className={labelClass}>
                                                Certificado TVDE
                                            </label>

                                            <input
                                                value={
                                                    form.certificado_tvde
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    update(
                                                        'certificado_tvde',
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                                className={
                                                    inputClass
                                                }
                                            />
                                        </div>

                                        <div>
                                            <label className={labelClass}>
                                                Validade TVDE
                                            </label>

                                            <input
                                                type="date"
                                                value={
                                                    form.certificado_tvde_valid_until
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    update(
                                                        'certificado_tvde_valid_until',
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                                className={
                                                    inputClass
                                                }
                                            />
                                        </div>
                                    </>
                                )}

                                <div>
                                    <label className={labelClass}>
                                        NIF
                                    </label>

                                    <input
                                        value={
                                            form.nif
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            update(
                                                'nif',
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                        className={
                                            inputClass
                                        }
                                    />

                                    {fieldError(
                                        'nif'
                                    )}
                                </div>

                                <div>
                                    <label className={labelClass}>
                                        Cartão de frota
                                    </label>

                                    <input
                                        value={
                                            form.cartao_frota
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            update(
                                                'cartao_frota',
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                        className={
                                            inputClass
                                        }
                                    />
                                </div>
                            </div>
                        </section>

                        <section>
                            <h3 className="font-semibold text-slate-900 mb-4">
                                Contacto e pagamento
                            </h3>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>
                                        E-mail
                                    </label>

                                    <input
                                        type="email"
                                        value={
                                            form.email
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            update(
                                                'email',
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                        className={
                                            inputClass
                                        }
                                    />

                                    {fieldError(
                                        'email'
                                    )}
                                </div>

                                <div>
                                    <label className={labelClass}>
                                        Telemóvel
                                    </label>

                                    <InternationalPhoneInput
    id="proprietario-telemovel"
    value={form.telemovel}
    onChange={(value) => update('telemovel', value)}
    className={inputClass}
/>
                                </div>

                                <div className="sm:col-span-2">
                                    <label className={labelClass}>
                                        IBAN
                                    </label>

                                    <input
                                        value={
                                            form.iban
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            update(
                                                'iban',
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                        className={
                                            inputClass
                                        }
                                    />
                                </div>
                            </div>
                        </section>

                        <section>
                            <h3 className="font-semibold text-slate-900 mb-4">
                                Morada
                            </h3>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <label className={labelClass}>
                                        Rua
                                    </label>

                                    <input
                                        value={
                                            form.endereco_rua
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            update(
                                                'endereco_rua',
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                        className={
                                            inputClass
                                        }
                                    />
                                </div>

                                <div>
                                    <label className={labelClass}>
                                        Número
                                    </label>

                                    <input
                                        value={
                                            form.endereco_numero
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            update(
                                                'endereco_numero',
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                        className={
                                            inputClass
                                        }
                                    />
                                </div>

                                <div>
                                    <label className={labelClass}>
                                        Complemento
                                    </label>

                                    <input
                                        value={
                                            form.endereco_complemento
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            update(
                                                'endereco_complemento',
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                        className={
                                            inputClass
                                        }
                                    />
                                </div>

                                <div>
                                    <label className={labelClass}>
                                        Código postal
                                    </label>

                                    <input
                                        value={
                                            form.endereco_cep
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            update(
                                                'endereco_cep',
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                        className={
                                            inputClass
                                        }
                                    />
                                </div>

                                <div>
                                    <label className={labelClass}>
                                        Cidade
                                    </label>

                                    <input
                                        value={
                                            form.endereco_cidade
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            update(
                                                'endereco_cidade',
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                        className={
                                            inputClass
                                        }
                                    />
                                </div>
                            </div>
                        </section>

                        <section>
                            <h3 className="font-semibold text-slate-900 mb-4">
                                Fotografia
                            </h3>

                            <label className={labelClass}>
                                URL da fotografia de perfil
                            </label>

                            <input
                                type="url"
                                value={
                                    form.foto_perfil_url
                                }
                                onChange={(
                                    event
                                ) =>
                                    update(
                                        'foto_perfil_url',
                                        event
                                            .target
                                            .value
                                    )
                                }
                                className={
                                    inputClass
                                }
                            />
                        </section>
                    </div>

                    <footer className="sticky bottom-0 border-t border-slate-200 bg-white px-6 py-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={
                                submitting
                            }
                            className="h-11 px-5 rounded-xl border border-slate-200 text-sm font-semibold"
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            disabled={
                                submitting
                            }
                            className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-60"
                        >
                            {submitting && (
                                <LoaderCircle className="w-4 h-4 animate-spin" />
                            )}

                            {proprietario
                                ? 'Guardar alterações'
                                : 'Criar proprietário'}
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    );
}
