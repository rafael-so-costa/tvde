import axios from 'axios';
import {
    AlertCircle,
    Calculator,
    FileSearch,
    FileUp,
    LoaderCircle,
    Sparkles,
    X,
} from 'lucide-react';
import {
    ChangeEvent,
    FormEvent,
    useEffect,
    useMemo,
    useState,
} from 'react';
import {
    readGreenReceipt,
    type GreenReceiptReadResult,
} from '../../lib/greenReceiptReader';
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

function validationErrors(
    error: unknown
): Record<string,string[]> {
    if(
        !axios.isAxiosError(
            error
        )
    ){
        return {};
    }

    const errors=
        error.response?.data
            ?.errors;

    if(
        !errors ||
        typeof errors !==
            'object'
    ){
        return {};
    }

    return errors as
        Record<string,string[]>;
}

function errorMessage(
    error: unknown
): string | null {
    if(!error){
        return null;
    }

    const errors=
        validationErrors(
            error
        );

    if(
        Object.keys(
            errors
        ).length>0
    ){
        return 'Existem dados inválidos. Corrija os campos assinalados.';
    }

    if(
        axios.isAxiosError(
            error
        )
    ){
        return (
            error.response?.data
                ?.message ??
            'Não foi possível enviar o recibo verde.'
        );
    }

    return 'Não foi possível enviar o recibo verde.';
}
function moneyInput(
    value:
        | number
        | null
): string {
    if(
        value === null
    ){
        return '';
    }

    return value.toFixed(2);
}

export default function ReciboVerdeUploadModal({
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
    ]=useState('');

    const [
        arquivo,
        setArquivo,
    ]=
        useState<File | null>(
            null
        );

    const [
        numeroDocumento,
        setNumeroDocumento,
    ]=useState('');

    const [
        dataEmissao,
        setDataEmissao,
    ]=useState('');

    const [
        nifEmitente,
        setNifEmitente,
    ]=useState('');

    const [
        nomeEmitente,
        setNomeEmitente,
    ]=useState('');

    const [
        nifAdquirente,
        setNifAdquirente,
    ]=useState('');

    const [
        nomeAdquirente,
        setNomeAdquirente,
    ]=useState('');

    const [
        valorBase,
        setValorBase,
    ]=useState('');

    const [
        valorIva,
        setValorIva,
    ]=useState('');

    const [
        retencaoIrs,
        setRetencaoIrs,
    ]=useState('');

    const [
        valorTotal,
        setValorTotal,
    ]=useState('');

    const [
        extracted,
        setExtracted,
    ]=
        useState<GreenReceiptReadResult | null>(
            null
        );

    const [
        reading,
        setReading,
    ]=useState(false);

    const [
        readingError,
        setReadingError,
    ]=
        useState<string | null>(
            null
        );

    const apiValidationErrors=
        validationErrors(
            error
        );

    function fieldError(
        field:string
    ):string | undefined{
        return apiValidationErrors[
            field
        ]?.[0];
    }

    useEffect(()=>{
        const firstField=
            Object.keys(
                apiValidationErrors
            )[0];

        if(!firstField){
            return;
        }

        requestAnimationFrame(()=>{
            requestAnimationFrame(()=>{
                const marker=
                    document.querySelector<HTMLElement>(
                        `[data-field-error="${firstField}"]`
                    );

                const control=
                    marker
                        ?.parentElement
                        ?.querySelector<HTMLElement>(
                            'input, select, textarea'
                        );

                (
                    control ??
                    marker
                )?.scrollIntoView({
                    behavior:'smooth',
                    block:'center',
                });

                control?.focus();
            });
        });
    },[
        error,
    ]);

    const expectedTotal=
        useMemo(()=>{
            const base=
                Number(
                    valorBase
                );

            const iva=
                Number(
                    valorIva || 0
                );

            const irs=
                Number(
                    retencaoIrs ||
                    0
                );

            if(
                !Number.isFinite(
                    base
                )
            ){
                return null;
            }

            return Math.round(
                (
                    base+
                    (
                        Number.isFinite(
                            iva
                        )
                            ? iva
                            : 0
                    )-
                    (
                        Number.isFinite(
                            irs
                        )
                            ? irs
                            : 0
                    )
                )*
                100
            )/100;
        },[
            valorBase,
            valorIva,
            retencaoIrs,
        ]);

    const selectedMotorista=
        useMemo(
            ()=>
                motoristas.find(
                    (item)=>
                        item.id ===
                        motoristaId
                ) ??
                null,
            [
                motoristas,
                motoristaId,
            ]
        );

    const localWarnings=
        useMemo(()=>{
            const warnings:
                string[] = [];

            if(
                !motoristaMode &&
                selectedMotorista?.nif &&
                nifEmitente &&
                selectedMotorista.nif
                    .replace(
                        /\D/g,
                        ''
                    ) !==
                    nifEmitente.replace(
                        /\D/g,
                        ''
                    )
            ){
                warnings.push(
                    'O NIF do emitente é diferente do NIF do motorista selecionado.'
                );
            }

            if(
                dataEmissao
            ){
                const today=
                    new Date();

                today.setHours(
                    0,
                    0,
                    0,
                    0
                );

                const date=
                    new Date(
                        `${dataEmissao}T00:00:00`
                    );

                if(
                    date > today
                ){
                    warnings.push(
                        'A data de emissão está no futuro.'
                    );
                }
            }

            if(
                expectedTotal !==
                    null &&
                valorTotal
            ){
                const informed=
                    Number(
                        valorTotal
                    );

                if(
                    Number.isFinite(
                        informed
                    ) &&
                    Math.abs(
                        informed-
                        expectedTotal
                    ) > 0.02
                ){
                    warnings.push(
                        `O total informado não coincide com base + IVA - retenção. Cálculo: € ${expectedTotal.toFixed(2)}.`
                    );
                }
            }

            return warnings;
        },[
            motoristaMode,
            selectedMotorista,
            nifEmitente,
            dataEmissao,
            expectedTotal,
            valorTotal,
        ]);

    if(!open){
        return null;
    }

    async function handleFile(
        event: ChangeEvent<HTMLInputElement>
    ){
        const file=
            event.target
                .files?.[0] ??
            null;

        setArquivo(file);
        setExtracted(null);
        setReadingError(null);

        if(!file){
            return;
        }

        if(
            file.size >
            20 * 1024 * 1024
        ){
            setArquivo(null);

            setReadingError(
                'O ficheiro não pode ultrapassar 20 MB.'
            );

            event.target.value='';

            return;
        }

        if(
            file.type !==
                'application/pdf' &&
            !file.name
                .toLowerCase()
                .endsWith('.pdf')
        ){
            setArquivo(null);

            setReadingError(
                'O recibo verde deve ser enviado em PDF.'
            );

            event.target.value='';

            return;
        }

        setReading(true);

        try{
            const result=
                await readGreenReceipt(
                    file
                );

            setExtracted(
                result
            );

            if(
                result.numero_documento
            ){
                setNumeroDocumento(
                    result.numero_documento
                );
            }

            if(
                result.data_emissao
            ){
                setDataEmissao(
                    result.data_emissao
                );
            }

            if(
                result.nif_emitente
            ){
                setNifEmitente(
                    result.nif_emitente
                );
            }

            if(
                result.nome_emitente
            ){
                setNomeEmitente(
                    result.nome_emitente
                );
            }

            if(
                result.nif_adquirente
            ){
                setNifAdquirente(
                    result.nif_adquirente
                );
            }

            if(
                result.nome_adquirente
            ){
                setNomeAdquirente(
                    result.nome_adquirente
                );
            }

            if(
                result.valor_base !==
                null
            ){
                setValorBase(
                    moneyInput(
                        result.valor_base
                    )
                );
            }

            if(
                result.valor_iva !==
                null
            ){
                setValorIva(
                    moneyInput(
                        result.valor_iva
                    )
                );
            }

            if(
                result.retencao_irs !==
                null
            ){
                setRetencaoIrs(
                    moneyInput(
                        result.retencao_irs
                    )
                );
            }

            if(
                result.valor_total !==
                null
            ){
                setValorTotal(
                    moneyInput(
                        result.valor_total
                    )
                );
            }
        }catch(exception){
            console.error(
                exception
            );

            setReadingError(
                'Não foi possível reconhecer automaticamente o recibo. Pode preencher os dados manualmente.'
            );
        }finally{
            setReading(false);
        }
    }

    async function submit(
        event: FormEvent
    ){
        event.preventDefault();

        if(!arquivo){
            setReadingError(
                'Selecione o PDF do recibo verde.'
            );

            return;
        }

        const data=
            new FormData();

        if(
            !motoristaMode &&
            motoristaId
        ){
            data.append(
                'motorista_id',
                motoristaId
            );
        }

        data.append(
            'numero_documento',
            numeroDocumento.trim()
        );

        data.append(
            'data_emissao',
            dataEmissao
        );

        data.append(
            'nif_emitente',
            nifEmitente.trim()
        );

        if(
            nomeEmitente.trim()
        ){
            data.append(
                'nome_emitente',
                nomeEmitente.trim()
            );
        }

        data.append(
            'nif_adquirente',
            nifAdquirente.trim()
        );

        if(
            nomeAdquirente.trim()
        ){
            data.append(
                'nome_adquirente',
                nomeAdquirente.trim()
            );
        }

        data.append(
            'valor_base',
            valorBase
        );

        data.append(
            'valor_iva',
            valorIva || '0'
        );

        data.append(
            'retencao_irs',
            retencaoIrs || '0'
        );

        data.append(
            'valor_total',
            valorTotal
        );

        data.append(
            'arquivo',
            arquivo
        );

        if(extracted){
            data.append(
                'dados_extraidos[texto]',
                extracted.texto.slice(
                    0,
                    50000
                )
            );

            data.append(
                'dados_extraidos[metodo]',
                extracted.metodo
            );

            Object.entries(
                extracted.confianca
            ).forEach(
                ([key,value])=>{
                    data.append(
                        `dados_extraidos[confianca][${key}]`,
                        String(value)
                    );
                }
            );
        }

        await onSubmit(
            data
        );
    }

    const apiError=
        errorMessage(
            error
        );

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
                className="advanced-validation-form relative w-full max-w-3xl max-h-[94vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
            >
                <div className="sticky top-0 z-20 px-6 py-5 bg-white border-b border-slate-200 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-950">
                            Enviar recibo verde
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Fatura-recibo emitida no Portal das Finanças.
                        </p>
                    </div>

                    <button
                        type="button"
                        disabled={saving}
                        onClick={onClose}
                        className="w-10 h-10 rounded-xl hover:bg-slate-100 text-slate-500 flex items-center justify-center disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {!motoristaMode && (
                        <div>
                            <label className="block mb-2 text-sm font-medium text-slate-700">
                                Motorista *
                            </label>

                            <select
                                value={motoristaId}
                                required
                                onChange={(event)=>
                                    setMotoristaId(
                                        event.target.value
                                    )
                                }
                                className={[
                                    "w-full h-11 px-3 rounded-xl border bg-white text-sm outline-none focus:ring-4",
                                    fieldError(
                                        'motorista_id'
                                    )
                                        ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
                                        : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10",
                                ].join(' ')}
                            >
                                <option value="">
                                    Selecione o motorista
                                </option>

                                {motoristas.map(
                                    (motorista)=>(
                                        <option
                                            key={motorista.id}
                                            value={motorista.id}
                                        >
                                            {motorista.nome_completo}
                                            {motorista.nif
                                                ? ` · ${motorista.nif}`
                                                : ''}
                                        </option>
                                    )
                                )}
                            </select>

                            {fieldError(
                                'motorista_id'
                            ) && (
                                <p
                                    data-field-error="motorista_id"
                                    className="mt-1.5 text-xs text-red-600"
                                >
                                    {fieldError(
                                        'motorista_id'
                                    )}
                                </p>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="block mb-2 text-sm font-medium text-slate-700">
                            PDF do recibo *
                        </label>

                        <label className="min-h-36 px-6 py-6 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-indigo-50/30 hover:border-indigo-400 flex flex-col items-center justify-center cursor-pointer transition">
                            {reading ? (
                                <>
                                    <LoaderCircle className="w-8 h-8 text-indigo-600 animate-spin" />

                                    <span className="mt-3 text-sm font-semibold text-slate-700">
                                        A ler o recibo...
                                    </span>

                                    <span className="mt-1 text-xs text-slate-500">
                                        O processamento ocorre localmente no browser.
                                    </span>
                                </>
                            ) : arquivo ? (
                                <>
                                    <FileSearch className="w-8 h-8 text-indigo-600" />

                                    <span className="mt-3 text-sm font-semibold text-slate-800 text-center">
                                        {arquivo.name}
                                    </span>

                                    <span className="mt-1 text-xs text-slate-500">
                                        {(arquivo.size/1024/1024).toFixed(2)} MB
                                    </span>
                                </>
                            ) : (
                                <>
                                    <FileUp className="w-8 h-8 text-indigo-600" />

                                    <span className="mt-3 text-sm font-semibold text-slate-800">
                                        Selecionar fatura-recibo
                                    </span>

                                    <span className="mt-1 text-xs text-slate-500">
                                        PDF · máximo 20 MB
                                    </span>
                                </>
                            )}

                            <input
                                type="file"
                                accept=".pdf,application/pdf"
                                disabled={
                                    reading ||
                                    saving
                                }
                                onChange={handleFile}
                                className="hidden"
                            />
                        </label>

                        {fieldError(
                            'arquivo'
                        ) && (
                            <p
                                data-field-error="arquivo"
                                className="mt-1.5 text-xs text-red-600"
                            >
                                {fieldError(
                                    'arquivo'
                                )}
                            </p>
                        )}
                    </div>

                    {extracted && (
                        <div className="p-4 rounded-2xl border border-indigo-200 bg-indigo-50 flex gap-3">
                            <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />

                            <div>
                                <p className="text-sm font-semibold text-indigo-900">
                                    Leitura automática concluída
                                </p>

                                <p className="mt-1 text-sm text-indigo-700">
                                    Método:{' '}
                                    {extracted.metodo === 'pdf_texto'
                                        ? 'texto do PDF'
                                        : 'OCR local'}
                                    . Confirme todos os valores antes de enviar.
                                </p>
                            </div>
                        </div>
                    )}

                    {readingError && (
                        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 flex gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />

                            <p className="text-sm text-amber-800">
                                {readingError}
                            </p>
                        </div>
                    )}

                    <div className="grid sm:grid-cols-2 gap-4">
                        <Field
                            field="numero_documento"
                            label="Número do documento"
                            value={numeroDocumento}
                            onChange={setNumeroDocumento}
                            error={fieldError(
                                'numero_documento'
                            )}
                            required
                        />

                        <div>
                            <label className="block mb-2 text-sm font-medium text-slate-700">
                                Data de emissão *
                            </label>

                            <input
                                type="date"
                                required
                                value={dataEmissao}
                                onChange={(event)=>
                                    setDataEmissao(
                                        event.target.value
                                    )
                                }
                                className={[
                                    "w-full h-11 px-3 rounded-xl border text-sm outline-none focus:ring-4",
                                    fieldError(
                                        'data_emissao'
                                    )
                                        ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
                                        : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10",
                                ].join(' ')}
                            />

                            {fieldError(
                                'data_emissao'
                            ) && (
                                <p
                                    data-field-error="data_emissao"
                                    className="mt-1.5 text-xs text-red-600"
                                >
                                    {fieldError(
                                        'data_emissao'
                                    )}
                                </p>
                            )}
                        </div>
                    </div>

                    <section className="p-5 rounded-2xl border border-slate-200">
                        <h3 className="font-semibold text-slate-900">
                            Emitente
                        </h3>

                        <p className="mt-1 mb-4 text-xs text-slate-500">
                            Trabalhador independente / motorista.
                        </p>

                        <div className="grid sm:grid-cols-2 gap-4">
                            <Field
                                field="nif_emitente"
                                label="NIF do emitente"
                                value={nifEmitente}
                                onChange={setNifEmitente}
                                error={fieldError(
                                    'nif_emitente'
                                )}
                                required
                            />

                            <Field
                                field="nome_emitente"
                                label="Nome do emitente"
                                value={nomeEmitente}
                                onChange={setNomeEmitente}
                                error={fieldError(
                                    'nome_emitente'
                                )}
                            />
                        </div>
                    </section>

                    <section className="p-5 rounded-2xl border border-slate-200">
                        <h3 className="font-semibold text-slate-900">
                            Adquirente
                        </h3>

                        <p className="mt-1 mb-4 text-xs text-slate-500">
                            Empresa TVDE indicada no documento.
                        </p>

                        <div className="grid sm:grid-cols-2 gap-4">
                            <Field
                                field="nif_adquirente"
                                label="NIF do adquirente"
                                value={nifAdquirente}
                                onChange={setNifAdquirente}
                                error={fieldError(
                                    'nif_adquirente'
                                )}
                                required
                            />

                            <Field
                                field="nome_adquirente"
                                label="Nome do adquirente"
                                value={nomeAdquirente}
                                onChange={setNomeAdquirente}
                                error={fieldError(
                                    'nome_adquirente'
                                )}
                            />
                        </div>
                    </section>

                    <section className="p-5 rounded-2xl border border-slate-200">
                        <div className="flex items-center gap-2 mb-4">
                            <Calculator className="w-5 h-5 text-indigo-600" />

                            <h3 className="font-semibold text-slate-900">
                                Valores
                            </h3>
                        </div>

                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <MoneyField
                                field="valor_base"
                                label="Valor base"
                                value={valorBase}
                                onChange={setValorBase}
                                error={fieldError(
                                    'valor_base'
                                )}
                                required
                            />

                            <MoneyField
                                field="valor_iva"
                                label="IVA"
                                value={valorIva}
                                onChange={setValorIva}
                                error={fieldError(
                                    'valor_iva'
                                )}
                            />

                            <MoneyField
                                field="retencao_irs"
                                label="Retenção IRS"
                                value={retencaoIrs}
                                onChange={setRetencaoIrs}
                                error={fieldError(
                                    'retencao_irs'
                                )}
                            />

                            <MoneyField
                                field="valor_total"
                                label="Valor total"
                                value={valorTotal}
                                onChange={setValorTotal}
                                error={fieldError(
                                    'valor_total'
                                )}
                                required
                            />
                        </div>

                        {expectedTotal !== null && (
                            <p className="mt-3 text-xs text-slate-500">
                                Valor calculado: € {expectedTotal.toFixed(2)}
                            </p>
                        )}
                    </section>

                    {localWarnings.length > 0 && (
                        <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50">
                            <div className="flex gap-3">
                                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />

                                <div>
                                    <p className="text-sm font-semibold text-amber-900">
                                        Verifique o documento
                                    </p>

                                    <div className="mt-2 space-y-1">
                                        {localWarnings.map(
                                            (warning,index)=>(
                                                <p
                                                    key={index}
                                                    className="text-sm text-amber-800"
                                                >
                                                    • {warning}
                                                </p>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <p className="text-xs text-slate-500">
                        O servidor valida o formato dos NIFs, ficheiro e valores. Divergências entre motorista, empresa, data ou cálculo do total são sinalizadas para conferência antes da validação final.
                    </p>

                    {apiError && (
                        <div className="p-4 rounded-xl border border-red-200 bg-red-50 flex gap-3">
                            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />

                            <p className="text-sm text-red-700">
                                {apiError}
                            </p>
                        </div>
                    )}
                </div>

                <div className="sticky bottom-0 z-20 px-6 py-4 bg-white border-t border-slate-200 flex justify-end gap-3">
                    <button
                        type="button"
                        disabled={saving}
                        onClick={onClose}
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

                        Enviar para validação
                    </button>
                </div>
            </form>
        </div>
    );
}

function Field({
    field,
    label,
    value,
    onChange,
    required=false,
    error,
}: {
    field: string;
    label: string;
    value: string;
    onChange: (
        value: string
    )=>void;
    required?: boolean;
    error?: string;
}) {
    return (
        <div>
            <label className="block mb-2 text-sm font-medium text-slate-700">
                {label}
                {required && ' *'}
            </label>

            <input
                value={value}
                required={required}
                onChange={(event)=>
                    onChange(
                        event.target.value
                    )
                }
                className={[
                    "w-full h-11 px-3 rounded-xl border text-sm outline-none focus:ring-4",
                    error
                        ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
                        : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10",
                ].join(' ')}
            />

            {error && (
                <p
                    data-field-error={field}
                    className="mt-1.5 text-xs text-red-600"
                >
                    {error}
                </p>
            )}
        </div>
    );
}
function MoneyField({
    field,
    label,
    value,
    onChange,
    required=false,
    error,
}: {
    field: string;
    label: string;
    value: string;
    onChange: (
        value: string
    )=>void;
    required?: boolean;
    error?: string;
}) {
    return (
        <div>
            <label className="block mb-2 text-sm font-medium text-slate-700">
                {label}
                {required && ' *'}
            </label>

            <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                    €
                </span>

                <input
                    type="number"
                    min="0"
                    step="0.01"
                    required={required}
                    value={value}
                    onChange={(event)=>
                        onChange(
                            event.target.value
                        )
                    }
                    className={[
                        "w-full h-11 pl-8 pr-3 rounded-xl border text-sm outline-none focus:ring-4",
                        error
                            ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
                            : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10",
                    ].join(' ')}
                />
            </div>

            {error && (
                <p
                    data-field-error={field}
                    className="mt-1.5 text-xs text-red-600"
                >
                    {error}
                </p>
            )}
        </div>
    );
}
