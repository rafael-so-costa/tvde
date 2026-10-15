import axios from 'axios';
import {
    FormEvent,
    useEffect,
    useState,
} from 'react';
import {
    Building2,
    LoaderCircle,
    X,
} from 'lucide-react';
import type {
    Empresa,
    EmpresaPayload,
    EmpresaStatus,
} from '../../types/empresa';

interface Props {
    open: boolean;
    empresa: Empresa | null;
    onClose: () => void;
    onSubmit: (
        payload: EmpresaPayload
    ) => Promise<void>;
}

interface FormState {
    nome_empresa: string;
    nif: string;
    email: string;
    telemovel: string;
    nome_gerente: string;
    endereco_rua: string;
    endereco_numero: string;
    endereco_complemento: string;
    endereco_cep: string;
    endereco_cidade: string;
    iban: string;
    capital_social: string;
    certificado_tvde: string;
    certificado_tvde_valid_until: string;
    logo_url: string;
    ativo: boolean;
    status_cadastro: EmpresaStatus;
}

const emptyForm: FormState = {
    nome_empresa: '',
    nif: '',
    email: '',
    telemovel: '',
    nome_gerente: '',
    endereco_rua: '',
    endereco_numero: '',
    endereco_complemento: '',
    endereco_cep: '',
    endereco_cidade: '',
    iban: '',
    capital_social: '',
    certificado_tvde: '',
    certificado_tvde_valid_until: '',
    logo_url: '',
    ativo: true,
    status_cadastro: 'pendente',
};

function valueOrNull(
    value: string
): string | null {
    const normalized =
        value.trim();

    return normalized === ''
        ? null
        : normalized;
}

export default function EmpresaFormModal({
    open,
    empresa,
    onClose,
    onSubmit,
}: Props) {
    const [form, setForm] =
        useState<FormState>(
            emptyForm
        );

    const [submitting, setSubmitting] =
        useState(false);

    const [errors, setErrors] =
        useState<
            Record<string, string[]>
        >({});

    const [
        generalError,
        setGeneralError,
    ] = useState('');

    useEffect(() => {
        if (!open) {
            return;
        }

        setErrors({});
        setGeneralError('');

        if (!empresa) {
            setForm(emptyForm);
            return;
        }

        setForm({
            nome_empresa:
                empresa.nome_empresa ??
                '',
            nif:
                empresa.nif ?? '',
            email:
                empresa.email ?? '',
            telemovel:
                empresa.telemovel ??
                '',
            nome_gerente:
                empresa.nome_gerente ??
                '',
            endereco_rua:
                empresa.endereco_rua ??
                '',
            endereco_numero:
                empresa
                    .endereco_numero ??
                '',
            endereco_complemento:
                empresa
                    .endereco_complemento ??
                '',
            endereco_cep:
                empresa.endereco_cep ??
                '',
            endereco_cidade:
                empresa
                    .endereco_cidade ??
                '',
            iban:
                empresa.iban ?? '',
            capital_social:
                empresa.capital_social ??
                '',
            certificado_tvde:
                empresa
                    .certificado_tvde ??
                '',
            certificado_tvde_valid_until:
                empresa
                    .certificado_tvde_valid_until
                    ?.slice(0, 10) ??
                '',
            logo_url:
                empresa.logo_url ?? '',
            ativo:
                empresa.ativo,
            status_cadastro:
                empresa.status_cadastro,
        });
    }, [open, empresa]);

    if (!open) {
        return null;
    }

    function update<K extends keyof FormState>(
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

        const payload: EmpresaPayload = {
            nome_empresa:
                form.nome_empresa.trim(),
            nif:
                form.nif.trim(),
            email:
                valueOrNull(
                    form.email
                ),
            telemovel:
                valueOrNull(
                    form.telemovel
                ),
            nome_gerente:
                valueOrNull(
                    form.nome_gerente
                ),
            endereco_rua:
                valueOrNull(
                    form.endereco_rua
                ),
            endereco_numero:
                valueOrNull(
                    form.endereco_numero
                ),
            endereco_complemento:
                valueOrNull(
                    form
                        .endereco_complemento
                ),
            endereco_cep:
                valueOrNull(
                    form.endereco_cep
                ),
            endereco_cidade:
                valueOrNull(
                    form.endereco_cidade
                ),
            iban:
                valueOrNull(
                    form.iban
                ),
            capital_social:
                capital === ''
                    ? null
                    : Number(capital),
            certificado_tvde:
                valueOrNull(
                    form
                        .certificado_tvde
                ),
            certificado_tvde_valid_until:
                valueOrNull(
                    form
                        .certificado_tvde_valid_until
                ),
            logo_url:
                valueOrNull(
                    form.logo_url
                ),
            ativo:
                form.ativo,
            status_cadastro:
                form.status_cadastro,
        };

        try {
            await onSubmit(payload);
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
                            'Não foi possível guardar a empresa.'
                    );
                }
            } else {
                setGeneralError(
                    'Não foi possível guardar a empresa.'
                );
            }
        } finally {
            setSubmitting(false);
        }
    }

    const fieldClass =
        'w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10';

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

        if (!message) {
            return null;
        }

        return (
            <p
                data-field-error={
                    field
                }
                className="mt-1.5 text-xs text-red-600"
            >
                {message}
            </p>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <button
                type="button"
                aria-label="Fechar"
                onClick={onClose}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />

            <div className="relative w-full max-w-4xl max-h-[92vh] overflow-hidden rounded-2xl bg-white shadow-2xl">
                <header className="h-20 px-6 flex items-center justify-between border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <Building2 className="w-5 h-5" />
                        </div>

                        <div>
                            <h2 className="font-semibold text-lg text-slate-950">
                                {empresa
                                    ? 'Editar empresa'
                                    : 'Nova empresa'}
                            </h2>

                            <p className="text-sm text-slate-500">
                                {empresa
                                    ? 'Atualize os dados da empresa.'
                                    : 'Cadastre uma empresa nesta organização.'}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition"
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
                    className="advanced-validation-form overflow-y-auto max-h-[calc(92vh-80px)]"
                >
                    <div className="p-6 space-y-8">
                        {generalError && (
                            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                {
                                    generalError
                                }
                            </div>
                        )}

                        <section>
                            <h3 className="font-semibold text-slate-900 mb-4">
                                Dados principais
                            </h3>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <label
                                        className={
                                            labelClass
                                        }
                                    >
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
                                            fieldClass
                                        }
                                        required
                                    />

                                    {fieldError(
                                        'nome_empresa'
                                    )}
                                </div>

                                <div>
                                    <label
                                        className={
                                            labelClass
                                        }
                                    >
                                        NIF *
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
                                            fieldClass
                                        }
                                        required
                                    />

                                    {fieldError(
                                        'nif'
                                    )}
                                </div>

                                <div>
                                    <label
                                        className={
                                            labelClass
                                        }
                                    >
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
                                            fieldClass
                                        }
                                    />

                                    {fieldError(
                                        'email'
                                    )}
                                </div>

                                <div>
                                    <label
                                        className={
                                            labelClass
                                        }
                                    >
                                        Telemóvel
                                    </label>

                                    <input
                                        value={
                                            form.telemovel
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            update(
                                                'telemovel',
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                        className={
                                            fieldClass
                                        }
                                    />

                                    {fieldError(
                                        'telemovel'
                                    )}
                                </div>

                                <div>
                                    <label
                                        className={
                                            labelClass
                                        }
                                    >
                                        Gerente
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
                                            fieldClass
                                        }
                                    />

                                    {fieldError(
                                        'nome_gerente'
                                    )}
                                </div>

                                <div>
                                    <label
                                        className={
                                            labelClass
                                        }
                                    >
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
                                            fieldClass
                                        }
                                    />

                                    {fieldError(
                                        'capital_social'
                                    )}
                                </div>
                            </div>
                        </section>

                        <section>
                            <h3 className="font-semibold text-slate-900 mb-4">
                                Morada
                            </h3>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <label
                                        className={
                                            labelClass
                                        }
                                    >
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
                                            fieldClass
                                        }
                                    />
                                </div>

                                <div>
                                    <label
                                        className={
                                            labelClass
                                        }
                                    >
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
                                            fieldClass
                                        }
                                    />
                                </div>

                                <div>
                                    <label
                                        className={
                                            labelClass
                                        }
                                    >
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
                                            fieldClass
                                        }
                                    />
                                </div>

                                <div>
                                    <label
                                        className={
                                            labelClass
                                        }
                                    >
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
                                            fieldClass
                                        }
                                    />
                                </div>

                                <div>
                                    <label
                                        className={
                                            labelClass
                                        }
                                    >
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
                                            fieldClass
                                        }
                                    />
                                </div>
                            </div>
                        </section>

                        <section>
                            <h3 className="font-semibold text-slate-900 mb-4">
                                Dados financeiros e TVDE
                            </h3>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <label
                                        className={
                                            labelClass
                                        }
                                    >
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
                                            fieldClass
                                        }
                                    />
                                </div>

                                <div>
                                    <label
                                        className={
                                            labelClass
                                        }
                                    >
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
                                            fieldClass
                                        }
                                    />
                                </div>

                                <div>
                                    <label
                                        className={
                                            labelClass
                                        }
                                    >
                                        Validade
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
                                            fieldClass
                                        }
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label
                                        className={
                                            labelClass
                                        }
                                    >
                                        URL do logótipo
                                    </label>

                                    <input
                                        type="url"
                                        value={
                                            form.logo_url
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            update(
                                                'logo_url',
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                        className={
                                            fieldClass
                                        }
                                    />
                                </div>
                            </div>
                        </section>

                        <section>
                            <h3 className="font-semibold text-slate-900 mb-4">
                                Estado
                            </h3>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <label
                                        className={
                                            labelClass
                                        }
                                    >
                                        Estado do cadastro
                                    </label>

                                    <select
                                        value={
                                            form.status_cadastro
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            update(
                                                'status_cadastro',
                                                event
                                                    .target
                                                    .value as EmpresaStatus
                                            )
                                        }
                                        className={
                                            fieldClass
                                        }
                                    >
                                        <option value="pendente">
                                            Pendente
                                        </option>
                                        <option value="ativo">
                                            Ativo
                                        </option>
                                        <option value="incompleto">
                                            Incompleto
                                        </option>
                                        <option value="inativo">
                                            Inativo
                                        </option>
                                    </select>
                                </div>

                                <div className="flex items-end">
                                    <label className="h-11 w-full rounded-xl border border-slate-200 px-4 flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={
                                                form.ativo
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                update(
                                                    'ativo',
                                                    event
                                                        .target
                                                        .checked
                                                )
                                            }
                                            className="w-4 h-4"
                                        />

                                        <span className="text-sm font-medium text-slate-700">
                                            Empresa ativa
                                        </span>
                                    </label>
                                </div>
                            </div>
                        </section>
                    </div>

                    <footer className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={
                                submitting
                            }
                            className="h-11 px-5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            disabled={
                                submitting
                            }
                            className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-60 transition flex items-center gap-2"
                        >
                            {submitting && (
                                <LoaderCircle className="w-4 h-4 animate-spin" />
                            )}

                            {empresa
                                ? 'Guardar alterações'
                                : 'Criar empresa'}
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    );
}
