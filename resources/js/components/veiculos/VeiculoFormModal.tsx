import axios from 'axios';
import {
    FormEvent,
    useEffect,
    useState,
} from 'react';
import {
    Car,
    LoaderCircle,
    X,
} from 'lucide-react';
import type {
    Proprietario,
} from '../../types/proprietario';
import type {
    Veiculo,
    VeiculoPayload,
} from '../../types/veiculo';

interface Props {
    open: boolean;
    veiculo: Veiculo | null;
    proprietarios: Proprietario[];
    proprietariosLoading: boolean;
    onClose: () => void;
    onSubmit: (
        payload: VeiculoPayload
    ) => Promise<void>;
}

interface FormState {
    proprietario_id: string;
    matricula: string;
    data_matricula: string;
    marca: string;
    modelo: string;
    chassi: string;
    cilindrada: string;
    potencia: string;
    combustivel: string;
    lugares: string;
    portas: string;
    cor: string;
    carta_verde: string;
    carta_verde_valid_until: string;
    inspecao_tvde: string;
    inspecao_tvde_valid_until: string;
    uber_valid_until: string;
    bolt_valid_until: string;
    extintor_valid_until: string;
    foto_principal_url: string;
    valor_caucao: string;
    valor_aluguel: string;
    via_verde: string;
}

const emptyForm: FormState = {
    proprietario_id: '',
    matricula: '',
    data_matricula: '',
    marca: '',
    modelo: '',
    chassi: '',
    cilindrada: '',
    potencia: '',
    combustivel: '',
    lugares: '',
    portas: '',
    cor: '',
    carta_verde: '',
    carta_verde_valid_until: '',
    inspecao_tvde: '',
    inspecao_tvde_valid_until: '',
    uber_valid_until: '',
    bolt_valid_until: '',
    extintor_valid_until: '',
    foto_principal_url: '',
    valor_caucao: '',
    valor_aluguel: '',
    via_verde: '',
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

function nullableNumber(
    value: string
): number | null {
    if (value.trim() === '') {
        return null;
    }

    return Number(value);
}

function dateValue(
    value: string | null
): string {
    return value
        ? value.slice(0, 10)
        : '';
}

function proprietarioNome(
    proprietario: Proprietario
): string {
    return (
        proprietario.nome_completo ??
        proprietario.nome_empresa ??
        'Sem nome'
    );
}

export default function VeiculoFormModal({
    open,
    veiculo,
    proprietarios,
    proprietariosLoading,
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

        if (!veiculo) {
            setForm(emptyForm);
            return;
        }

        setForm({
            proprietario_id:
                veiculo.proprietario_id ??
                '',
            matricula:
                veiculo.matricula ?? '',
            data_matricula:
                dateValue(
                    veiculo.data_matricula
                ),
            marca:
                veiculo.marca ?? '',
            modelo:
                veiculo.modelo ?? '',
            chassi:
                veiculo.chassi ?? '',
            cilindrada:
                veiculo.cilindrada !==
                    null
                    ? String(
                          veiculo.cilindrada
                      )
                    : '',
            potencia:
                veiculo.potencia !== null
                    ? String(
                          veiculo.potencia
                      )
                    : '',
            combustivel:
                veiculo.combustivel ??
                '',
            lugares:
                veiculo.lugares !== null
                    ? String(
                          veiculo.lugares
                      )
                    : '',
            portas:
                veiculo.portas !== null
                    ? String(
                          veiculo.portas
                      )
                    : '',
            cor:
                veiculo.cor ?? '',
            carta_verde:
                veiculo.carta_verde ??
                '',
            carta_verde_valid_until:
                dateValue(
                    veiculo.carta_verde_valid_until
                ),
            inspecao_tvde:
                veiculo.inspecao_tvde ??
                '',
            inspecao_tvde_valid_until:
                dateValue(
                    veiculo.inspecao_tvde_valid_until
                ),
            uber_valid_until:
                dateValue(
                    veiculo.uber_valid_until
                ),
            bolt_valid_until:
                dateValue(
                    veiculo.bolt_valid_until
                ),
            extintor_valid_until:
                dateValue(
                    veiculo.extintor_valid_until
                ),
            foto_principal_url:
                veiculo.foto_principal_url ??
                '',
            valor_caucao:
                veiculo.valor_caucao ??
                '',
            valor_aluguel:
                veiculo.valor_aluguel ??
                '',
            via_verde:
                veiculo.via_verde ?? '',
        });
    }, [
        open,
        veiculo,
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

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
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

                (
                    control ??
                    marker
                )?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                });

                control?.focus();
            });
        });
    }

    function fieldError(
        field: keyof FormState
    ) {
        const message =
            errors[field]?.[0];

        return message ? (
            <p
                data-field-error={field}
                className="mt-1.5 text-xs text-red-600"
            >
                {message}
            </p>
        ) : null;
    }
    async function handleSubmit(
        event: FormEvent
    ) {
        event.preventDefault();

        setSubmitting(true);
        setErrors({});
        setGeneralError('');

        const payload: VeiculoPayload = {
            proprietario_id:
                nullable(
                    form.proprietario_id
                ),
            matricula:
                form.matricula
                    .trim()
                    .toUpperCase(),
            data_matricula:
                nullable(
                    form.data_matricula
                ),
            marca:
                form.marca.trim(),
            modelo:
                form.modelo.trim(),
            chassi:
                nullable(
                    form.chassi
                ),
            cilindrada:
                nullableNumber(
                    form.cilindrada
                ),
            potencia:
                nullableNumber(
                    form.potencia
                ),
            combustivel:
                nullable(
                    form.combustivel
                ),
            lugares:
                nullableNumber(
                    form.lugares
                ),
            portas:
                nullableNumber(
                    form.portas
                ),
            cor:
                nullable(form.cor),
            carta_verde:
                nullable(
                    form.carta_verde
                ),
            carta_verde_valid_until:
                nullable(
                    form.carta_verde_valid_until
                ),
            inspecao_tvde:
                nullable(
                    form.inspecao_tvde
                ),
            inspecao_tvde_valid_until:
                nullable(
                    form.inspecao_tvde_valid_until
                ),
            uber_valid_until:
                nullable(
                    form.uber_valid_until
                ),
            bolt_valid_until:
                nullable(
                    form.bolt_valid_until
                ),
            extintor_valid_until:
                nullable(
                    form.extintor_valid_until
                ),
            foto_principal_url:
                nullable(
                    form.foto_principal_url
                ),
            valor_caucao:
                nullableNumber(
                    form.valor_caucao
                ),
            valor_aluguel:
                nullableNumber(
                    form.valor_aluguel
                ),
            via_verde:
                nullable(
                    form.via_verde
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
                            'Não foi possível guardar o veículo.'
                    );
                }
            } else {
                setGeneralError(
                    'Não foi possível guardar o veículo.'
                );
            }
        } finally {
            setSubmitting(false);
        }
    }

    const inputClass =
        'w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10';

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
                            <Car className="w-5 h-5" />
                        </div>

                        <div>
                            <h2 className="font-semibold text-lg text-slate-950">
                                {veiculo
                                    ? 'Editar veículo'
                                    : 'Novo veículo'}
                            </h2>

                            <p className="text-sm text-slate-500">
                                O estado do cadastro é calculado automaticamente.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500"
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

                        <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
                            <strong>*</strong> Campos obrigatórios para o veículo ficar ativo. O cadastro pode ser guardado incompleto, mas permanecerá inativo.
                        </div>

                        <section>
                            <h3 className="font-semibold text-slate-900 mb-4">
                                Identificação
                            </h3>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>
                                        Matrícula *
                                    </label>

                                    <input
                                        value={
                                            form.matricula
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            update(
                                                'matricula',
                                                event.target.value.toUpperCase()
                                            )
                                        }
                                        maxLength={20}
                                        required
                                        placeholder="AA-00-AA"
                                        className={
                                            inputClass
                                        }
                                    />

                                    {fieldError(
                                        'matricula'
                                    )}
                                </div>

                                <div>
                                    <label className={labelClass}>
                                        Data da matrícula *
                                    </label>

                                    <input
                                        type="date"
                                        value={
                                            form.data_matricula
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            update(
                                                'data_matricula',
                                                event.target.value
                                            )
                                        }
                                        className={
                                            inputClass
                                        }
                                    />
                                    {fieldError(
                                        'data_matricula'
                                    )}
                                </div>

                                <div>
                                    <label className={labelClass}>
                                        Marca *
                                    </label>

                                    <input
                                        value={
                                            form.marca
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            update(
                                                'marca',
                                                event.target.value
                                            )
                                        }
                                        required
                                        className={
                                            inputClass
                                        }
                                    />

                                    {fieldError(
                                        'marca'
                                    )}
                                </div>

                                <div>
                                    <label className={labelClass}>
                                        Modelo *
                                    </label>

                                    <input
                                        value={
                                            form.modelo
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            update(
                                                'modelo',
                                                event.target.value
                                            )
                                        }
                                        required
                                        className={
                                            inputClass
                                        }
                                    />

                                    {fieldError(
                                        'modelo'
                                    )}
                                </div>

                                <div>
                                    <label className={labelClass}>
                                        Cor *
                                    </label>

                                    <input
                                        value={
                                            form.cor
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            update(
                                                'cor',
                                                event.target.value
                                            )
                                        }
                                        className={
                                            inputClass
                                        }
                                    />
                                    {fieldError(
                                        'cor'
                                    )}
                                </div>

                                <div>
                                    <label className={labelClass}>
                                        Chassi / VIN *
                                    </label>

                                    <input
                                        value={
                                            form.chassi
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            update(
                                                'chassi',
                                                event.target.value
                                            )
                                        }
                                        className={
                                            inputClass
                                        }
                                    />
                                    {fieldError(
                                        'chassi'
                                    )}
                                </div>

                                <div className="sm:col-span-2">
                                    <label className={labelClass}>
                                        Proprietário *
                                    </label>

                                    <select
                                        value={
                                            form.proprietario_id
                                        }
                                        disabled={
                                            proprietariosLoading
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            update(
                                                'proprietario_id',
                                                event.target.value
                                            )
                                        }
                                        className={
                                            inputClass
                                        }
                                    >
                                        <option value="">
                                            Sem proprietário
                                        </option>

                                        {proprietarios.map(
                                            (
                                                proprietario
                                            ) => (
                                                <option
                                                    key={
                                                        proprietario.id
                                                    }
                                                    value={
                                                        proprietario.id
                                                    }
                                                >
                                                    {proprietarioNome(
                                                        proprietario
                                                    )}
                                                    {proprietario.nif
                                                        ? ` · NIF ${proprietario.nif}`
                                                        : ''}
                                                </option>
                                            )
                                        )}
                                    </select>

                                    {fieldError(
                                        'proprietario_id'
                                    )}
                                </div>
                            </div>
                        </section>

                        <section>
                            <h3 className="font-semibold text-slate-900 mb-4">
                                Características
                            </h3>

                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div>
                                    <label className={labelClass}>
                                        Combustível
                                    </label>

                                    <input
                                        list="combustiveis"
                                        value={
                                            form.combustivel
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            update(
                                                'combustivel',
                                                event.target.value
                                            )
                                        }
                                        className={
                                            inputClass
                                        }
                                    />
                                    {fieldError(
                                        'combustivel'
                                    )}

                                    <datalist id="combustiveis">
                                        <option value="Elétrico" />
                                        <option value="Gasolina" />
                                        <option value="Diesel" />
                                        <option value="Híbrido" />
                                        <option value="Híbrido Plug-in" />
                                        <option value="GPL" />
                                    </datalist>
                                </div>

                                <div>
                                    <label className={labelClass}>
                                        Cilindrada
                                    </label>

                                    <input
                                        type="number"
                                        min="0"
                                        value={
                                            form.cilindrada
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            update(
                                                'cilindrada',
                                                event.target.value
                                            )
                                        }
                                        className={
                                            inputClass
                                        }
                                    />
                                    {fieldError(
                                        'cilindrada'
                                    )}
                                </div>

                                <div>
                                    <label className={labelClass}>
                                        Potência
                                    </label>

                                    <input
                                        type="number"
                                        min="0"
                                        value={
                                            form.potencia
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            update(
                                                'potencia',
                                                event.target.value
                                            )
                                        }
                                        className={
                                            inputClass
                                        }
                                    />
                                    {fieldError(
                                        'potencia'
                                    )}
                                </div>

                                <div>
                                    <label className={labelClass}>
                                        Lugares
                                    </label>

                                    <input
                                        type="number"
                                        min="1"
                                        max="99"
                                        value={
                                            form.lugares
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            update(
                                                'lugares',
                                                event.target.value
                                            )
                                        }
                                        className={
                                            inputClass
                                        }
                                    />
                                    {fieldError(
                                        'lugares'
                                    )}
                                </div>

                                <div>
                                    <label className={labelClass}>
                                        Portas
                                    </label>

                                    <input
                                        type="number"
                                        min="1"
                                        max="20"
                                        value={
                                            form.portas
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            update(
                                                'portas',
                                                event.target.value
                                            )
                                        }
                                        className={
                                            inputClass
                                        }
                                    />
                                    {fieldError(
                                        'portas'
                                    )}
                                </div>

                                <div>
                                    <label className={labelClass}>
                                        Via Verde
                                    </label>

                                    <input
                                        value={
                                            form.via_verde
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            update(
                                                'via_verde',
                                                event.target.value
                                            )
                                        }
                                        className={
                                            inputClass
                                        }
                                    />
                                    {fieldError(
                                        'via_verde'
                                    )}
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
                                        Carta Verde *
                                    </label>

                                    <input
                                        value={
                                            form.carta_verde
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            update(
                                                'carta_verde',
                                                event.target.value
                                            )
                                        }
                                        className={
                                            inputClass
                                        }
                                    />
                                    {fieldError(
                                        'carta_verde'
                                    )}
                                </div>

                                <div>
                                    <label className={labelClass}>
                                        Validade da Carta Verde *
                                    </label>

                                    <input
                                        type="date"
                                        value={
                                            form.carta_verde_valid_until
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            update(
                                                'carta_verde_valid_until',
                                                event.target.value
                                            )
                                        }
                                        className={
                                            inputClass
                                        }
                                    />
                                    {fieldError(
                                        'carta_verde_valid_until'
                                    )}
                                </div>

                                <div>
                                    <label className={labelClass}>
                                        Inspeção TVDE *
                                    </label>

                                    <input
                                        value={
                                            form.inspecao_tvde
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            update(
                                                'inspecao_tvde',
                                                event.target.value
                                            )
                                        }
                                        className={
                                            inputClass
                                        }
                                    />
                                    {fieldError(
                                        'inspecao_tvde'
                                    )}
                                </div>

                                <div>
                                    <label className={labelClass}>
                                        Validade da inspeção *
                                    </label>

                                    <input
                                        type="date"
                                        value={
                                            form.inspecao_tvde_valid_until
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            update(
                                                'inspecao_tvde_valid_until',
                                                event.target.value
                                            )
                                        }
                                        className={
                                            inputClass
                                        }
                                    />
                                    {fieldError(
                                        'inspecao_tvde_valid_until'
                                    )}
                                </div>

                                <div>
                                    <label className={labelClass}>
                                        Validade Uber
                                    </label>

                                    <input
                                        type="date"
                                        value={
                                            form.uber_valid_until
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            update(
                                                'uber_valid_until',
                                                event.target.value
                                            )
                                        }
                                        className={
                                            inputClass
                                        }
                                    />
                                    {fieldError(
                                        'uber_valid_until'
                                    )}
                                </div>

                                <div>
                                    <label className={labelClass}>
                                        Validade Bolt
                                    </label>

                                    <input
                                        type="date"
                                        value={
                                            form.bolt_valid_until
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            update(
                                                'bolt_valid_until',
                                                event.target.value
                                            )
                                        }
                                        className={
                                            inputClass
                                        }
                                    />
                                    {fieldError(
                                        'bolt_valid_until'
                                    )}
                                </div>

                                <div>
                                    <label className={labelClass}>
                                        Validade do extintor
                                    </label>

                                    <input
                                        type="date"
                                        value={
                                            form.extintor_valid_until
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            update(
                                                'extintor_valid_until',
                                                event.target.value
                                            )
                                        }
                                        className={
                                            inputClass
                                        }
                                    />
                                    {fieldError(
                                        'extintor_valid_until'
                                    )}
                                </div>
                            </div>
                        </section>

                        <section>
                            <h3 className="font-semibold text-slate-900 mb-4">
                                Valores
                            </h3>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>
                                        Caução (€)
                                    </label>

                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={
                                            form.valor_caucao
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            update(
                                                'valor_caucao',
                                                event.target.value
                                            )
                                        }
                                        className={
                                            inputClass
                                        }
                                    />
                                    {fieldError(
                                        'valor_caucao'
                                    )}
                                </div>

                                <div>
                                    <label className={labelClass}>
                                        Valor de aluguer (€)
                                    </label>

                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={
                                            form.valor_aluguel
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            update(
                                                'valor_aluguel',
                                                event.target.value
                                            )
                                        }
                                        className={
                                            inputClass
                                        }
                                    />
                                    {fieldError(
                                        'valor_aluguel'
                                    )}
                                </div>
                            </div>
                        </section>

                        <section>
                            <h3 className="font-semibold text-slate-900 mb-4">
                                Fotografia
                            </h3>

                            <label className={labelClass}>
                                URL da fotografia principal
                            </label>

                            <input
                                type="url"
                                value={
                                    form.foto_principal_url
                                }
                                onChange={(
                                    event
                                ) =>
                                    update(
                                        'foto_principal_url',
                                        event.target.value
                                    )
                                }
                                className={
                                    inputClass
                                }
                            />
                                    {fieldError(
                                        'foto_principal_url'
                                    )}
                        </section>
                    </div>

                    <footer className="sticky bottom-0 border-t border-slate-200 bg-white px-6 py-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={
                                submitting
                            }
                            className="h-11 px-5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700"
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

                            {veiculo
                                ? 'Guardar alterações'
                                : 'Criar veículo'}
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    );
}
