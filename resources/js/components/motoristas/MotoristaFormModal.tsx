import axios from 'axios';
import { FormEvent, useEffect, useState } from 'react';
import { LoaderCircle, UserRound, X } from 'lucide-react';
import type {
    Motorista,
    MotoristaEstadoCivil,
    MotoristaPayload,
    MotoristaTipoDocumento,
} from '../../types/motorista';

interface Props {
    open: boolean;
    motorista: Motorista | null;
    onClose: () => void;
    onSubmit: (payload: MotoristaPayload) => Promise<void>;
}

interface FormState {
    nome_completo: string;
    data_nascimento: string;
    filhos: string;
    estado_civil: MotoristaEstadoCivil | '';
    tipo_documento: MotoristaTipoDocumento | '';
    numero_documento: string;
    documento_valid_until: string;
    carta_numero: string;
    carta_valid_until: string;
    registo_criminal_valid_until: string;
    nif: string;
    email: string;
    telemovel: string;
    endereco_rua: string;
    endereco_numero: string;
    endereco_complemento: string;
    endereco_cidade: string;
    endereco_cep: string;
    iban: string;
    foto_perfil_url: string;
    bolt_email: string;
    bolt_telemovel: string;
    uber_email: string;
    uber_telemovel: string;
    certificado_tvde: string;
    certificado_tvde_valid_until: string;
    cartao_frota: string;
    contato_urgencia_nome: string;
    contato_urgencia_telemovel: string;
}

const emptyForm: FormState = {
    nome_completo: '',
    data_nascimento: '',
    filhos: '0',
    estado_civil: '',
    tipo_documento: '',
    numero_documento: '',
    documento_valid_until: '',
    carta_numero: '',
    carta_valid_until: '',
    registo_criminal_valid_until: '',
    nif: '',
    email: '',
    telemovel: '',
    endereco_rua: '',
    endereco_numero: '',
    endereco_complemento: '',
    endereco_cidade: '',
    endereco_cep: '',
    iban: '',
    foto_perfil_url: '',
    bolt_email: '',
    bolt_telemovel: '',
    uber_email: '',
    uber_telemovel: '',
    certificado_tvde: '',
    certificado_tvde_valid_until: '',
    cartao_frota: '',
    contato_urgencia_nome: '',
    contato_urgencia_telemovel: '',
};

function nullable(value: string): string | null {
    const normalized = value.trim();

    return normalized === '' ? null : normalized;
}

function dateValue(value: string | null): string {
    return value ? value.slice(0, 10) : '';
}

export default function MotoristaFormModal({
    open,
    motorista,
    onClose,
    onSubmit,
}: Props) {
    const [form, setForm] = useState<FormState>(emptyForm);
    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const [generalError, setGeneralError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!open) {
            return;
        }

        setErrors({});
        setGeneralError('');

        if (!motorista) {
            setForm(emptyForm);
            return;
        }

        setForm({
            nome_completo: motorista.nome_completo ?? '',
            data_nascimento: dateValue(motorista.data_nascimento),
            filhos: String(motorista.filhos ?? 0),
            estado_civil: motorista.estado_civil ?? '',
            tipo_documento: motorista.tipo_documento ?? '',
            numero_documento: motorista.numero_documento ?? '',
            documento_valid_until: dateValue(motorista.documento_valid_until),
            carta_numero: motorista.carta_numero ?? '',
            carta_valid_until: dateValue(motorista.carta_valid_until),
            registo_criminal_valid_until: dateValue(
                motorista.registo_criminal_valid_until
            ),
            nif: motorista.nif ?? '',
            email: motorista.email ?? '',
            telemovel: motorista.telemovel ?? '',
            endereco_rua: motorista.endereco_rua ?? '',
            endereco_numero: motorista.endereco_numero ?? '',
            endereco_complemento: motorista.endereco_complemento ?? '',
            endereco_cidade: motorista.endereco_cidade ?? '',
            endereco_cep: motorista.endereco_cep ?? '',
            iban: motorista.iban ?? '',
            foto_perfil_url: motorista.foto_perfil_url ?? '',
            bolt_email: motorista.bolt_email ?? '',
            bolt_telemovel: motorista.bolt_telemovel ?? '',
            uber_email: motorista.uber_email ?? '',
            uber_telemovel: motorista.uber_telemovel ?? '',
            certificado_tvde: motorista.certificado_tvde ?? '',
            certificado_tvde_valid_until: dateValue(
                motorista.certificado_tvde_valid_until
            ),
            cartao_frota: motorista.cartao_frota ?? '',
            contato_urgencia_nome: motorista.contato_urgencia_nome ?? '',
            contato_urgencia_telemovel:
                motorista.contato_urgencia_telemovel ?? '',
        });
    }, [open, motorista]);

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
            setErrors((current) => ({
                ...current,
                [field]: [],
            }));
        }
    }

    function fieldError(field: keyof FormState) {
        const message = errors[field]?.[0];

        return message ? (
            <p className="mt-1 text-xs text-red-600">{message}</p>
        ) : null;
    }

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();

        setSubmitting(true);
        setErrors({});
        setGeneralError('');

        const payload: MotoristaPayload = {
            nome_completo: form.nome_completo.trim(),
            data_nascimento: nullable(form.data_nascimento),
            filhos: form.filhos.trim() === '' ? null : Number(form.filhos),
            estado_civil: form.estado_civil || null,
            tipo_documento: form.tipo_documento || null,
            numero_documento: nullable(form.numero_documento),
            documento_valid_until: nullable(form.documento_valid_until),
            carta_numero: nullable(form.carta_numero),
            carta_valid_until: nullable(form.carta_valid_until),
            registo_criminal_valid_until: nullable(
                form.registo_criminal_valid_until
            ),
            nif: nullable(form.nif),
            email: nullable(form.email),
            telemovel: nullable(form.telemovel),
            endereco_rua: nullable(form.endereco_rua),
            endereco_numero: nullable(form.endereco_numero),
            endereco_complemento: nullable(form.endereco_complemento),
            endereco_cidade: nullable(form.endereco_cidade),
            endereco_cep: nullable(form.endereco_cep),
            iban: nullable(form.iban),
            foto_perfil_url: nullable(form.foto_perfil_url),
            bolt_email: nullable(form.bolt_email),
            bolt_telemovel: nullable(form.bolt_telemovel),
            uber_email: nullable(form.uber_email),
            uber_telemovel: nullable(form.uber_telemovel),
            certificado_tvde: nullable(form.certificado_tvde),
            certificado_tvde_valid_until: nullable(
                form.certificado_tvde_valid_until
            ),
            cartao_frota: nullable(form.cartao_frota),
            contato_urgencia_nome: nullable(form.contato_urgencia_nome),
            contato_urgencia_telemovel: nullable(
                form.contato_urgencia_telemovel
            ),
        };

        try {
            await onSubmit(payload);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const response = error.response?.data;

                setErrors(response?.errors ?? {});
                setGeneralError(
                    response?.message ??
                        'Não foi possível guardar o motorista.'
                );
            } else {
                setGeneralError(
                    'Não foi possível guardar o motorista.'
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
                            <UserRound className="w-5 h-5" />
                        </div>

                        <div>
                            <h2 className="font-semibold text-lg text-slate-950">
                                {motorista
                                    ? 'Editar motorista'
                                    : 'Novo motorista'}
                            </h2>

                            <p className="text-sm text-slate-500">
                                O estado do cadastro é calculado automaticamente.
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
                    className="overflow-y-auto max-h-[calc(94vh-80px)]"
                >
                    <div className="p-6 space-y-8">
                        {generalError && (
                            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                                {generalError}
                            </div>
                        )}

                        <section>
                            <h3 className="font-semibold text-slate-900 mb-4">
                                Dados pessoais
                            </h3>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <label className={labelClass}>
                                        Nome completo *
                                    </label>

                                    <input
                                        value={form.nome_completo}
                                        onChange={(event) =>
                                            update(
                                                'nome_completo',
                                                event.target.value
                                            )
                                        }
                                        required
                                        className={inputClass}
                                    />

                                    {fieldError('nome_completo')}
                                </div>

                                <div>
                                    <label className={labelClass}>
                                        NIF
                                    </label>

                                    <input
                                        value={form.nif}
                                        onChange={(event) =>
                                            update(
                                                'nif',
                                                event.target.value
                                            )
                                        }
                                        className={inputClass}
                                    />

                                    {fieldError('nif')}
                                </div>

                                <div>
                                    <label className={labelClass}>
                                        Data de nascimento
                                    </label>

                                    <input
                                        type="date"
                                        value={form.data_nascimento}
                                        onChange={(event) =>
                                            update(
                                                'data_nascimento',
                                                event.target.value
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label className={labelClass}>
                                        Estado civil
                                    </label>

                                    <select
                                        value={form.estado_civil}
                                        onChange={(event) =>
                                            update(
                                                'estado_civil',
                                                event.target
                                                    .value as MotoristaEstadoCivil | ''
                                            )
                                        }
                                        className={inputClass}
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
                                        Filhos
                                    </label>

                                    <input
                                        type="number"
                                        min="0"
                                        value={form.filhos}
                                        onChange={(event) =>
                                            update(
                                                'filhos',
                                                event.target.value
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </div>
                            </div>
                        </section>

                        <section>
                            <h3 className="font-semibold text-slate-900 mb-4">
                                Documentação
                            </h3>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>
                                        Tipo de documento
                                    </label>

                                    <select
                                        value={form.tipo_documento}
                                        onChange={(event) =>
                                            update(
                                                'tipo_documento',
                                                event.target
                                                    .value as MotoristaTipoDocumento | ''
                                            )
                                        }
                                        className={inputClass}
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
                                        value={form.numero_documento}
                                        onChange={(event) =>
                                            update(
                                                'numero_documento',
                                                event.target.value
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label className={labelClass}>
                                        Validade do documento
                                    </label>

                                    <input
                                        type="date"
                                        value={form.documento_valid_until}
                                        onChange={(event) =>
                                            update(
                                                'documento_valid_until',
                                                event.target.value
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label className={labelClass}>
                                        Carta de condução
                                    </label>

                                    <input
                                        value={form.carta_numero}
                                        onChange={(event) =>
                                            update(
                                                'carta_numero',
                                                event.target.value
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label className={labelClass}>
                                        Validade da carta
                                    </label>

                                    <input
                                        type="date"
                                        value={form.carta_valid_until}
                                        onChange={(event) =>
                                            update(
                                                'carta_valid_until',
                                                event.target.value
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label className={labelClass}>
                                        Validade do registo criminal
                                    </label>

                                    <input
                                        type="date"
                                        value={
                                            form.registo_criminal_valid_until
                                        }
                                        onChange={(event) =>
                                            update(
                                                'registo_criminal_valid_until',
                                                event.target.value
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label className={labelClass}>
                                        Certificado TVDE
                                    </label>

                                    <input
                                        value={form.certificado_tvde}
                                        onChange={(event) =>
                                            update(
                                                'certificado_tvde',
                                                event.target.value
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label className={labelClass}>
                                        Validade certificado TVDE
                                    </label>

                                    <input
                                        type="date"
                                        value={
                                            form.certificado_tvde_valid_until
                                        }
                                        onChange={(event) =>
                                            update(
                                                'certificado_tvde_valid_until',
                                                event.target.value
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </div>
                            </div>
                        </section>

                        <section>
                            <h3 className="font-semibold text-slate-900 mb-4">
                                Contacto
                            </h3>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>
                                        E-mail
                                    </label>

                                    <input
                                        type="email"
                                        value={form.email}
                                        onChange={(event) =>
                                            update(
                                                'email',
                                                event.target.value
                                            )
                                        }
                                        className={inputClass}
                                    />

                                    {fieldError('email')}
                                </div>

                                <div>
                                    <label className={labelClass}>
                                        Telemóvel
                                    </label>

                                    <input
                                        value={form.telemovel}
                                        onChange={(event) =>
                                            update(
                                                'telemovel',
                                                event.target.value
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label className={labelClass}>
                                        Contacto de emergência
                                    </label>

                                    <input
                                        value={form.contato_urgencia_nome}
                                        onChange={(event) =>
                                            update(
                                                'contato_urgencia_nome',
                                                event.target.value
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label className={labelClass}>
                                        Telemóvel de emergência
                                    </label>

                                    <input
                                        value={
                                            form.contato_urgencia_telemovel
                                        }
                                        onChange={(event) =>
                                            update(
                                                'contato_urgencia_telemovel',
                                                event.target.value
                                            )
                                        }
                                        className={inputClass}
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
                                        value={form.endereco_rua}
                                        onChange={(event) =>
                                            update(
                                                'endereco_rua',
                                                event.target.value
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label className={labelClass}>
                                        Número
                                    </label>

                                    <input
                                        value={form.endereco_numero}
                                        onChange={(event) =>
                                            update(
                                                'endereco_numero',
                                                event.target.value
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label className={labelClass}>
                                        Complemento
                                    </label>

                                    <input
                                        value={form.endereco_complemento}
                                        onChange={(event) =>
                                            update(
                                                'endereco_complemento',
                                                event.target.value
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label className={labelClass}>
                                        Código postal
                                    </label>

                                    <input
                                        value={form.endereco_cep}
                                        onChange={(event) =>
                                            update(
                                                'endereco_cep',
                                                event.target.value
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label className={labelClass}>
                                        Cidade
                                    </label>

                                    <input
                                        value={form.endereco_cidade}
                                        onChange={(event) =>
                                            update(
                                                'endereco_cidade',
                                                event.target.value
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </div>
                            </div>
                        </section>

                        <section>
                            <h3 className="font-semibold text-slate-900 mb-4">
                                Plataformas
                            </h3>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>
                                        Uber e-mail
                                    </label>

                                    <input
                                        type="email"
                                        value={form.uber_email}
                                        onChange={(event) =>
                                            update(
                                                'uber_email',
                                                event.target.value
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label className={labelClass}>
                                        Uber telemóvel
                                    </label>

                                    <input
                                        value={form.uber_telemovel}
                                        onChange={(event) =>
                                            update(
                                                'uber_telemovel',
                                                event.target.value
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label className={labelClass}>
                                        Bolt e-mail
                                    </label>

                                    <input
                                        type="email"
                                        value={form.bolt_email}
                                        onChange={(event) =>
                                            update(
                                                'bolt_email',
                                                event.target.value
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label className={labelClass}>
                                        Bolt telemóvel
                                    </label>

                                    <input
                                        value={form.bolt_telemovel}
                                        onChange={(event) =>
                                            update(
                                                'bolt_telemovel',
                                                event.target.value
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </div>
                            </div>
                        </section>

                        <section>
                            <h3 className="font-semibold text-slate-900 mb-4">
                                Financeiro e frota
                            </h3>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <label className={labelClass}>
                                        IBAN
                                    </label>

                                    <input
                                        value={form.iban}
                                        onChange={(event) =>
                                            update(
                                                'iban',
                                                event.target.value
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label className={labelClass}>
                                        Cartão de frota
                                    </label>

                                    <input
                                        value={form.cartao_frota}
                                        onChange={(event) =>
                                            update(
                                                'cartao_frota',
                                                event.target.value
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label className={labelClass}>
                                        URL da fotografia
                                    </label>

                                    <input
                                        type="url"
                                        value={form.foto_perfil_url}
                                        onChange={(event) =>
                                            update(
                                                'foto_perfil_url',
                                                event.target.value
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </div>
                            </div>
                        </section>
                    </div>

                    <footer className="sticky bottom-0 border-t border-slate-200 bg-white px-6 py-4 flex justify-end gap-3">
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
                            className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-60"
                        >
                            {submitting && (
                                <LoaderCircle className="w-4 h-4 animate-spin" />
                            )}

                            {motorista
                                ? 'Guardar alterações'
                                : 'Criar motorista'}
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    );
}
