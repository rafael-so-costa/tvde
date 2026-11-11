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
    privacidade_contacto_email: string;
    privacidade_contacto_telefone: string;
    privacidade_epd_nome: string;
    privacidade_epd_email: string;
    privacidade_destinatarios: string;
    privacidade_subcontratantes: string;
    privacidade_prazo_identificacao: string;
    privacidade_prazo_contratos: string;
    privacidade_prazo_fiscal: string;
    privacidade_prazo_operacional: string;
    privacidade_prazo_consentimentos: string;
    privacidade_prazo_localizacao: string;
    privacidade_transferencias_internacionais: string;
    privacidade_decisoes_automatizadas: string;
    privacidade_finalidade_localizacao: string;
    privacidade_finalidade_dados_especiais: string;
    privacidade_categorias_dados_especiais: string;
    privacidade_condicao_artigo9: string;
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
    privacidade_contacto_email: '',
    privacidade_contacto_telefone: '',
    privacidade_epd_nome: '',
    privacidade_epd_email: '',
    privacidade_destinatarios: '',
    privacidade_subcontratantes: '',
    privacidade_prazo_identificacao: '',
    privacidade_prazo_contratos: '',
    privacidade_prazo_fiscal: '',
    privacidade_prazo_operacional: '',
    privacidade_prazo_consentimentos: '',
    privacidade_prazo_localizacao: '',
    privacidade_transferencias_internacionais: '',
    privacidade_decisoes_automatizadas: '',
    privacidade_finalidade_localizacao: '',
    privacidade_finalidade_dados_especiais: '',
    privacidade_categorias_dados_especiais: '',
    privacidade_condicao_artigo9: '',
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

const privacyFields = [
    { name: 'privacidade_contacto_email', label: 'E-mail para privacidade', input: 'email', long: false },
    { name: 'privacidade_contacto_telefone', label: 'Telefone para privacidade', input: 'tel', long: false },
    { name: 'privacidade_epd_nome', label: 'Nome do encarregado de proteção de dados', input: 'text', long: false },
    { name: 'privacidade_epd_email', label: 'E-mail do encarregado de proteção de dados', input: 'email', long: false },
    { name: 'privacidade_destinatarios', label: 'Destinatários dos dados', input: 'text', long: true },
    { name: 'privacidade_subcontratantes', label: 'Categorias de subcontratantes', input: 'text', long: true },
    { name: 'privacidade_prazo_identificacao', label: 'Conservação - identificação e cadastro', input: 'text', long: true },
    { name: 'privacidade_prazo_contratos', label: 'Conservação - contratos e documentação', input: 'text', long: true },
    { name: 'privacidade_prazo_fiscal', label: 'Conservação - dados contabilísticos e fiscais', input: 'text', long: true },
    { name: 'privacidade_prazo_operacional', label: 'Conservação - registos operacionais', input: 'text', long: true },
    { name: 'privacidade_prazo_consentimentos', label: 'Conservação - consentimentos', input: 'text', long: true },
    { name: 'privacidade_prazo_localizacao', label: 'Conservação - dados de localização', input: 'text', long: true },
    { name: 'privacidade_transferencias_internacionais', label: 'Transferências internacionais e garantias', input: 'text', long: true },
    { name: 'privacidade_decisoes_automatizadas', label: 'Decisões automatizadas e definição de perfis', input: 'text', long: true },
    { name: 'privacidade_finalidade_localizacao', label: 'Finalidade facultativa de localização', input: 'text', long: true },
    { name: 'privacidade_finalidade_dados_especiais', label: 'Finalidade de tratamento de dados especiais', input: 'text', long: true },
    { name: 'privacidade_categorias_dados_especiais', label: 'Categorias de dados especiais', input: 'text', long: true },
    { name: 'privacidade_condicao_artigo9', label: 'Condição do artigo 9 do RGPD', input: 'text', long: true },
] as const;
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
            privacidade_contacto_email:
                empresa.privacidade_contacto_email ?? '',
            privacidade_contacto_telefone:
                empresa.privacidade_contacto_telefone ?? '',
            privacidade_epd_nome:
                empresa.privacidade_epd_nome ?? '',
            privacidade_epd_email:
                empresa.privacidade_epd_email ?? '',
            privacidade_destinatarios:
                empresa.privacidade_destinatarios ?? '',
            privacidade_subcontratantes:
                empresa.privacidade_subcontratantes ?? '',
            privacidade_prazo_identificacao:
                empresa.privacidade_prazo_identificacao ?? '',
            privacidade_prazo_contratos:
                empresa.privacidade_prazo_contratos ?? '',
            privacidade_prazo_fiscal:
                empresa.privacidade_prazo_fiscal ?? '',
            privacidade_prazo_operacional:
                empresa.privacidade_prazo_operacional ?? '',
            privacidade_prazo_consentimentos:
                empresa.privacidade_prazo_consentimentos ?? '',
            privacidade_prazo_localizacao:
                empresa.privacidade_prazo_localizacao ?? '',
            privacidade_transferencias_internacionais:
                empresa.privacidade_transferencias_internacionais ?? '',
            privacidade_decisoes_automatizadas:
                empresa.privacidade_decisoes_automatizadas ?? '',
            privacidade_finalidade_localizacao:
                empresa.privacidade_finalidade_localizacao ?? '',
            privacidade_finalidade_dados_especiais:
                empresa.privacidade_finalidade_dados_especiais ?? '',
            privacidade_categorias_dados_especiais:
                empresa.privacidade_categorias_dados_especiais ?? '',
            privacidade_condicao_artigo9:
                empresa.privacidade_condicao_artigo9 ?? '',
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
            privacidade_contacto_email: valueOrNull(form.privacidade_contacto_email),
            privacidade_contacto_telefone: valueOrNull(form.privacidade_contacto_telefone),
            privacidade_epd_nome: valueOrNull(form.privacidade_epd_nome),
            privacidade_epd_email: valueOrNull(form.privacidade_epd_email),
            privacidade_destinatarios: valueOrNull(form.privacidade_destinatarios),
            privacidade_subcontratantes: valueOrNull(form.privacidade_subcontratantes),
            privacidade_prazo_identificacao: valueOrNull(form.privacidade_prazo_identificacao),
            privacidade_prazo_contratos: valueOrNull(form.privacidade_prazo_contratos),
            privacidade_prazo_fiscal: valueOrNull(form.privacidade_prazo_fiscal),
            privacidade_prazo_operacional: valueOrNull(form.privacidade_prazo_operacional),
            privacidade_prazo_consentimentos: valueOrNull(form.privacidade_prazo_consentimentos),
            privacidade_prazo_localizacao: valueOrNull(form.privacidade_prazo_localizacao),
            privacidade_transferencias_internacionais: valueOrNull(form.privacidade_transferencias_internacionais),
            privacidade_decisoes_automatizadas: valueOrNull(form.privacidade_decisoes_automatizadas),
            privacidade_finalidade_localizacao: valueOrNull(form.privacidade_finalidade_localizacao),
            privacidade_finalidade_dados_especiais: valueOrNull(form.privacidade_finalidade_dados_especiais),
            privacidade_categorias_dados_especiais: valueOrNull(form.privacidade_categorias_dados_especiais),
            privacidade_condicao_artigo9: valueOrNull(form.privacidade_condicao_artigo9),
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
                                Proteção de dados (RGPD)
                            </h3>

                            <p className="text-sm text-slate-500 mb-4">
                                Configure os dados reais da empresa.
                                O encarregado de proteção de dados
                                é preenchido quando aplicável.
                                Estes valores serão utilizados nos
                                modelos documentais.
                            </p>

                            <div className="grid sm:grid-cols-2 gap-4">
                                {privacyFields.map((field) => (
                                    <div
                                        key={field.name}
                                        className={
                                            field.long
                                                ? "sm:col-span-2"
                                                : ""
                                        }
                                    >
                                        <label className={labelClass}>
                                            {field.label}
                                        </label>

                                        {field.long ? (
                                            <textarea
                                                rows={3}
                                                value={form[field.name]}
                                                onChange={(event) =>
                                                    update(
                                                        field.name,
                                                        event.target.value
                                                    )
                                                }
                                                className={fieldClass}
                                            />
                                        ) : (
                                            <input
                                                type={field.input}
                                                value={form[field.name]}
                                                onChange={(event) =>
                                                    update(
                                                        field.name,
                                                        event.target.value
                                                    )
                                                }
                                                className={fieldClass}
                                            />
                                        )}

                                        {fieldError(field.name)}
                                    </div>
                                ))}
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
