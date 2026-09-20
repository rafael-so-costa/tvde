import axios from 'axios';
import {
    AlertCircle,
    FileSearch,
    FileUp,
    LoaderCircle,
    Sparkles,
    X,
} from 'lucide-react';
import {
    ChangeEvent,
    FormEvent,
    useState,
} from 'react';
import {
    readCriminalRecord,
    type CriminalRecordReadResult,
} from '../../lib/registoCriminalReader';
import type { Motorista } from '../../types/motorista';

interface Props {
    open: boolean;
    motoristaMode: boolean;
    motoristas: Motorista[];
    saving: boolean;
    error: unknown;
    onClose: () => void;
    onSubmit: (
        formData: FormData
    ) => Promise<void>;
}

function errorMessage(
    error: unknown
): string | null {
    if (!error) {
        return null;
    }

    if (axios.isAxiosError(error)) {
        const errors =
            error.response?.data
                ?.errors;

        if (errors) {
            const first =
                Object.values(
                    errors
                )[0];

            if (
                Array.isArray(first) &&
                first.length > 0
            ) {
                return String(
                    first[0]
                );
            }
        }

        return (
            error.response?.data
                ?.message ??
            'Não foi possível enviar o documento.'
        );
    }

    return 'Não foi possível enviar o documento.';
}

export default function RegistoCriminalUploadModal({
    open,
    motoristaMode,
    motoristas,
    saving,
    error,
    onClose,
    onSubmit,
}: Props) {
    const [
        motoristaId,
        setMotoristaId,
    ] = useState('');

    const [
        codigo,
        setCodigo,
    ] = useState('');

    const [
        dataEmissao,
        setDataEmissao,
    ] = useState('');

    const [
        dataValidade,
        setDataValidade,
    ] = useState('');

    const [
        arquivo,
        setArquivo,
    ] = useState<File | null>(
        null
    );

    const [
        extracted,
        setExtracted,
    ] =
        useState<CriminalRecordReadResult | null>(
            null
        );

    const [
        reading,
        setReading,
    ] = useState(false);

    const [
        readingError,
        setReadingError,
    ] = useState<string | null>(
        null
    );

    if (!open) {
        return null;
    }

    async function handleFile(
        event: ChangeEvent<HTMLInputElement>
    ) {
        const file =
            event.target.files?.[0] ??
            null;

        setArquivo(file);
        setExtracted(null);
        setReadingError(null);

        if (!file) {
            return;
        }

        if (
            file.size >
            10 * 1024 * 1024
        ) {
            setReadingError(
                'O ficheiro não pode ultrapassar 10 MB.'
            );

            setArquivo(null);
            event.target.value = '';

            return;
        }

        setReading(true);

        try {
            const result =
                await readCriminalRecord(
                    file
                );

            setExtracted(result);

            if (
                result.codigo_consulta
            ) {
                setCodigo(
                    result.codigo_consulta
                );
            }

            if (
                result.data_emissao
            ) {
                setDataEmissao(
                    result.data_emissao
                );
            }

            if (
                result.data_validade
            ) {
                setDataValidade(
                    result.data_validade
                );
            }
        } catch (exception) {
            console.error(
                exception
            );

            setReadingError(
                'Não foi possível reconhecer automaticamente o documento. Pode preencher os campos manualmente.'
            );
        } finally {
            setReading(false);
        }
    }

    async function submit(
        event: FormEvent
    ) {
        event.preventDefault();

        if (!arquivo) {
            setReadingError(
                'Selecione o ficheiro do registo criminal.'
            );

            return;
        }

        const formData =
            new FormData();

        if (
            !motoristaMode &&
            motoristaId
        ) {
            formData.append(
                'motorista_id',
                motoristaId
            );
        }

        formData.append(
            'codigo_consulta',
            codigo.trim()
        );

        if (dataEmissao) {
            formData.append(
                'data_emissao',
                dataEmissao
            );
        }

        formData.append(
            'data_validade',
            dataValidade
        );

        formData.append(
            'arquivo',
            arquivo
        );

        if (extracted) {
            formData.append(
                'dados_extraidos[texto]',
                extracted.texto.slice(
                    0,
                    30000
                )
            );

            if (
                extracted.nome_titular
            ) {
                formData.append(
                    'dados_extraidos[nome_titular]',
                    extracted.nome_titular
                );
            }

            if (
                extracted.codigo_consulta
            ) {
                formData.append(
                    'dados_extraidos[codigo_consulta]',
                    extracted.codigo_consulta
                );
            }

            if (
                extracted.data_emissao
            ) {
                formData.append(
                    'dados_extraidos[data_emissao]',
                    extracted.data_emissao
                );
            }

            if (
                extracted.data_validade
            ) {
                formData.append(
                    'dados_extraidos[data_validade]',
                    extracted.data_validade
                );
            }

            Object.entries(
                extracted.confianca
            ).forEach(
                ([key, value]) => {
                    formData.append(
                        `dados_extraidos[confianca][${key}]`,
                        String(value)
                    );
                }
            );
        }

        await onSubmit(formData);
    }

    const apiError =
        errorMessage(error);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
                type="button"
                aria-label="Fechar"
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
                onClick={
                    saving
                        ? undefined
                        : onClose
                }
            />

            <form
                onSubmit={submit}
                className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
            >
                <div className="sticky top-0 bg-white z-10 px-6 py-5 border-b border-slate-200 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-950">
                            Enviar registo
                            criminal
                        </h2>

                        <p className="text-sm text-slate-500 mt-1">
                            PDF ou fotografia
                            do certificado.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="w-10 h-10 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-500 disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {!motoristaMode && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Motorista
                            </label>

                            <select
                                value={
                                    motoristaId
                                }
                                onChange={(
                                    event
                                ) =>
                                    setMotoristaId(
                                        event
                                            .target
                                            .value
                                    )
                                }
                                required
                                className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                            >
                                <option value="">
                                    Selecione
                                    o motorista
                                </option>

                                {motoristas.map(
                                    (
                                        motorista
                                    ) => (
                                        <option
                                            key={
                                                motorista.id
                                            }
                                            value={
                                                motorista.id
                                            }
                                        >
                                            {
                                                motorista.nome_completo
                                            }
                                            {motorista.nif
                                                ? ` · ${motorista.nif}`
                                                : ''}
                                        </option>
                                    )
                                )}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Documento
                        </label>

                        <label className="min-h-36 rounded-2xl border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/30 flex flex-col items-center justify-center px-6 py-6 cursor-pointer transition">
                            {reading ? (
                                <>
                                    <LoaderCircle className="w-8 h-8 text-indigo-600 animate-spin" />

                                    <span className="mt-3 text-sm font-medium text-slate-700">
                                        A reconhecer
                                        documento...
                                    </span>

                                    <span className="mt-1 text-xs text-slate-500">
                                        O processamento
                                        é feito no
                                        browser.
                                    </span>
                                </>
                            ) : arquivo ? (
                                <>
                                    <FileSearch className="w-8 h-8 text-indigo-600" />

                                    <span className="mt-3 text-sm font-semibold text-slate-800 text-center">
                                        {
                                            arquivo.name
                                        }
                                    </span>

                                    <span className="mt-1 text-xs text-slate-500">
                                        {(
                                            arquivo.size /
                                            1024 /
                                            1024
                                        ).toFixed(
                                            2
                                        )}{' '}
                                        MB
                                    </span>
                                </>
                            ) : (
                                <>
                                    <FileUp className="w-8 h-8 text-indigo-600" />

                                    <span className="mt-3 text-sm font-semibold text-slate-800">
                                        Selecionar
                                        documento
                                    </span>

                                    <span className="mt-1 text-xs text-slate-500">
                                        PDF, JPG ou
                                        PNG · máximo
                                        10 MB
                                    </span>
                                </>
                            )}

                            <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                                onChange={
                                    handleFile
                                }
                                disabled={
                                    reading ||
                                    saving
                                }
                                className="hidden"
                            />
                        </label>
                    </div>

                    {extracted && (
                        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 flex gap-3">
                            <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />

                            <div>
                                <p className="text-sm font-semibold text-indigo-900">
                                    Leitura
                                    automática
                                    concluída
                                </p>

                                <p className="mt-1 text-sm text-indigo-700">
                                    Método:{' '}
                                    {extracted.metodo ===
                                    'pdf_texto'
                                        ? 'texto do PDF'
                                        : 'OCR local'}
                                    . Confirme os
                                    dados antes de
                                    enviar.
                                </p>

                                {extracted.nome_titular && (
                                    <p className="mt-2 text-xs text-indigo-700">
                                        Titular
                                        identificado:{' '}
                                        <strong>
                                            {
                                                extracted.nome_titular
                                            }
                                        </strong>
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {readingError && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />

                            <p className="text-sm text-amber-800">
                                {
                                    readingError
                                }
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Código de
                            consulta
                        </label>

                        <input
                            value={codigo}
                            onChange={(
                                event
                            ) =>
                                setCodigo(
                                    event.target
                                        .value
                                )
                            }
                            required
                            maxLength={120}
                            placeholder="Código indicado no certificado"
                            className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                        />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Data de
                                emissão
                            </label>

                            <input
                                type="date"
                                value={
                                    dataEmissao
                                }
                                onChange={(
                                    event
                                ) =>
                                    setDataEmissao(
                                        event
                                            .target
                                            .value
                                    )
                                }
                                className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Data de
                                validade
                            </label>

                            <input
                                type="date"
                                value={
                                    dataValidade
                                }
                                onChange={(
                                    event
                                ) =>
                                    setDataValidade(
                                        event
                                            .target
                                            .value
                                    )
                                }
                                required
                                className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                            />
                        </div>
                    </div>

                    {apiError && (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex gap-3">
                            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />

                            <p className="text-sm text-red-700">
                                {apiError}
                            </p>
                        </div>
                    )}
                </div>

                <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="h-11 px-5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                        Cancelar
                    </button>

                    <button
                        type="submit"
                        disabled={
                            saving ||
                            reading
                        }
                        className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                    >
                        {saving && (
                            <LoaderCircle className="w-4 h-4 animate-spin" />
                        )}

                        Enviar para
                        validação
                    </button>
                </div>
            </form>
        </div>
    );
}
