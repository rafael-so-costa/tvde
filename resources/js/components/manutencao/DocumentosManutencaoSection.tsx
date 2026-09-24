import axios from 'axios';
import {useState} from 'react';
import type {FormEvent} from 'react';
import {useMutation,useQueryClient} from '@tanstack/react-query';
import {
    AlertCircle,
    Download,
    Eye,
    FileText,
    LoaderCircle,
    Plus,
    ScanText,
    Trash2,
    Upload,
    X,
} from 'lucide-react';
import api from '../../lib/api';
import {useTenant} from '../../contexts/TenantContext';
import type {
    Manutencao,
    ManutencaoDocumento,
    ManutencaoDocumentoTipo,
} from '../../types/manutencao';

interface Props {
    manutencao:Manutencao;
    onChanged:()=>Promise<void>|void;
}

const tipoLabels:Record<ManutencaoDocumentoTipo,string>={
    orcamento:'Orçamento',
    fatura:'Fatura',
    ordem_servico:'Ordem de serviço',
    relatorio_diagnostico:'Relatório de diagnóstico',
    fotografia:'Fotografia',
    garantia:'Garantia',
    outro:'Outro',
};

function apiError(error:unknown):string{
    if(axios.isAxiosError(error)){
        const errors=error.response?.data?.errors;

        if(errors){
            const first=Object.values(errors)[0];

            if(Array.isArray(first) && first.length){
                return String(first[0]);
            }
        }

        return error.response?.data?.message
            ?? 'Não foi possível concluir a operação.';
    }

    return 'Não foi possível concluir a operação.';
}

function fileSize(value:number):string{
    if(value<1024){
        return `${value} B`;
    }

    if(value<1024*1024){
        return `${(value/1024).toFixed(1)} KB`;
    }

    return `${(value/(1024*1024)).toFixed(1)} MB`;
}

export default function DocumentosManutencaoSection({
    manutencao,
    onChanged,
}:Props){
    const {tenant}=useTenant();
    const queryClient=useQueryClient();

    const [tipo,setTipo]=useState<ManutencaoDocumentoTipo>('outro');
    const [arquivo,setArquivo]=useState<File|null>(null);
    const [error,setError]=useState<string|null>(null);

    const [ocrDocument,setOcrDocument]=
        useState<ManutencaoDocumento|null>(null);

    const [ocrText,setOcrText]=useState('');

    async function refresh(){
        await queryClient.invalidateQueries({
            queryKey:[
                'manutencao',
                tenant?.id,
                manutencao.id,
            ],
        });

        await onChanged();
    }

    const uploadMutation=useMutation({
        mutationFn:async()=>{
            if(!arquivo){
                throw new Error('Selecione um ficheiro.');
            }

            const data=new FormData();

            data.append('tipo',tipo);
            data.append('arquivo',arquivo);

            const response=await api.post(
                `/api/manutencoes/${manutencao.id}/documentos`,
                data
            );

            return response.data.data as ManutencaoDocumento;
        },

        onMutate:()=>{
            setError(null);
        },

        onSuccess:async()=>{
            setArquivo(null);
            setTipo('outro');

            await refresh();
        },

        onError:error=>{
            setError(apiError(error));
        },
    });

    const deleteMutation=useMutation({
        mutationFn:async(
            documento:ManutencaoDocumento
        )=>{
            if(
                !window.confirm(
                    `Eliminar o documento "${documento.arquivo_nome}"?`
                )
            ){
                throw new Error('__cancelled__');
            }

            await api.delete(
                `/api/manutencoes/${manutencao.id}/documentos/${documento.id}`
            );

            return documento.id;
        },

        onError:error=>{
            if(
                error instanceof Error &&
                error.message==='__cancelled__'
            ){
                return;
            }

            setError(apiError(error));
        },

        onSuccess:refresh,
    });

    const processMutation=useMutation({
        mutationFn:async(
            documento:ManutencaoDocumento
        )=>{
            const response=await api.post(
                `/api/manutencoes/${manutencao.id}/documentos/${documento.id}/processar`
            );

            return response.data.data;
        },

        onMutate:()=>{
            setError(null);
        },

        onSuccess:refresh,

        onError:error=>{
            setError(apiError(error));
        },
    });

    const ocrMutation=useMutation({
        mutationFn:async()=>{
            if(!ocrDocument){
                throw new Error('Documento inválido.');
            }

            const response=await api.post(
                `/api/manutencoes/${manutencao.id}/documentos/${ocrDocument.id}/ocr`,
                {
                    texto:ocrText,
                }
            );

            return response.data.data;
        },

        onMutate:()=>{
            setError(null);
        },

        onSuccess:async()=>{
            setOcrDocument(null);
            setOcrText('');

            await refresh();
        },

        onError:error=>{
            setError(apiError(error));
        },
    });

    function submit(
        event:FormEvent<HTMLFormElement>
    ){
        event.preventDefault();

        uploadMutation.mutate();
    }

    function view(
        documento:ManutencaoDocumento
    ){
        window.open(
            `/api/manutencoes/${manutencao.id}/documentos/${documento.id}/arquivo`,
            '_blank',
            'noopener,noreferrer'
        );
    }

    function download(
        documento:ManutencaoDocumento
    ){
        window.open(
            `/api/manutencoes/${manutencao.id}/documentos/${documento.id}/arquivo/download`,
            '_blank',
            'noopener,noreferrer'
        );
    }

    const documentos=
        manutencao.documentos ?? [];

    const busy=
        uploadMutation.isPending ||
        deleteMutation.isPending ||
        processMutation.isPending;

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600"/>

                <div>
                    <h3 className="font-semibold text-slate-950">
                        Documentos
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                        Faturas, orçamentos, relatórios, fotografias e comprovativos associados à ordem.
                    </p>
                </div>
            </div>

            {error && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0"/>

                    <p className="text-sm text-red-700">
                        {error}
                    </p>
                </div>
            )}

            <form
                onSubmit={submit}
                className="mt-5 rounded-xl bg-slate-50 p-4"
            >
                <div className="grid md:grid-cols-[190px_1fr_auto] gap-3">
                    <select
                        value={tipo}
                        onChange={event=>
                            setTipo(
                                event.target.value as
                                    ManutencaoDocumentoTipo
                            )
                        }
                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
                    >
                        {Object.entries(tipoLabels)
                            .map(([value,label])=>(
                                <option
                                    key={value}
                                    value={value}
                                >
                                    {label}
                                </option>
                            ))}
                    </select>

                    <input
                        type="file"
                        onChange={event=>
                            setArquivo(
                                event.target.files?.[0]
                                ?? null
                            )
                        }
                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    />

                    <button
                        type="submit"
                        disabled={
                            !arquivo ||
                            uploadMutation.isPending
                        }
                        className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {uploadMutation.isPending ? (
                            <LoaderCircle className="w-4 h-4 animate-spin"/>
                        ) : (
                            <Upload className="w-4 h-4"/>
                        )}

                        Enviar
                    </button>
                </div>
            </form>

            {documentos.length===0 ? (
                <div className="mt-5 rounded-xl border border-dashed border-slate-200 py-10 text-center">
                    <FileText className="mx-auto w-9 h-9 text-slate-300"/>

                    <p className="mt-2 text-sm text-slate-500">
                        Nenhum documento associado.
                    </p>
                </div>
            ) : (
                <div className="mt-5 space-y-3">
                    {documentos.map(documento=>(
                        <div
                            key={documento.id}
                            className="rounded-xl border border-slate-200 p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
                        >
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="inline-flex rounded-full bg-indigo-50 text-indigo-700 px-2.5 py-1 text-xs font-semibold">
                                        {tipoLabels[
                                            documento.tipo
                                        ]}
                                    </span>

                                    <p className="font-semibold text-slate-900 truncate">
                                        {documento.arquivo_nome}
                                    </p>
                                </div>

                                <p className="mt-2 text-xs text-slate-500">
                                    {documento.arquivo_mime} · {fileSize(documento.arquivo_tamanho)}
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={()=>
                                        view(documento)
                                    }
                                    className="h-9 px-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 flex items-center gap-2"
                                >
                                    <Eye className="w-4 h-4"/>
                                    Ver
                                </button>

                                <button
                                    type="button"
                                    onClick={()=>
                                        download(documento)
                                    }
                                    className="h-9 px-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 flex items-center gap-2"
                                >
                                    <Download className="w-4 h-4"/>
                                    Baixar
                                </button>

                                {documento.arquivo_mime
                                    .toLowerCase()
                                    .includes('pdf') && (
                                    <button
                                        type="button"
                                        disabled={busy}
                                        onClick={()=>
                                            processMutation.mutate(
                                                documento
                                            )
                                        }
                                        className="h-9 px-3 rounded-xl border border-indigo-200 text-indigo-700 text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                                    >
                                        <ScanText className="w-4 h-4"/>
                                        Processar PDF
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={()=>{
                                        setOcrDocument(
                                            documento
                                        );
                                        setOcrText('');
                                    }}
                                    className="h-9 px-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4"/>
                                    Registar OCR
                                </button>

                                <button
                                    type="button"
                                    disabled={busy}
                                    onClick={()=>
                                        deleteMutation.mutate(
                                            documento
                                        )
                                    }
                                    className="w-9 h-9 rounded-xl border border-red-200 text-red-600 flex items-center justify-center disabled:opacity-50"
                                >
                                    <Trash2 className="w-4 h-4"/>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {ocrDocument && (
                <div className="fixed inset-0 z-[90] bg-slate-950/60 backdrop-blur-sm p-4 flex items-center justify-center">
                    <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
                        <div className="px-6 py-5 border-b border-slate-200 flex items-start justify-between">
                            <div>
                                <h3 className="font-bold text-slate-950">
                                    Registar texto OCR
                                </h3>

                                <p className="mt-1 text-sm text-slate-500">
                                    {ocrDocument.arquivo_nome}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={()=>{
                                    setOcrDocument(null);
                                    setOcrText('');
                                }}
                                className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center"
                            >
                                <X className="w-5 h-5"/>
                            </button>
                        </div>

                        <div className="p-6">
                            {ocrMutation.isError && (
                                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                                    {apiError(
                                        ocrMutation.error
                                    )}
                                </div>
                            )}

                            <textarea
                                rows={16}
                                maxLength={2000000}
                                value={ocrText}
                                onChange={event=>
                                    setOcrText(
                                        event.target.value
                                    )
                                }
                                placeholder="Cole aqui o texto extraído por OCR..."
                                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-mono outline-none focus:border-indigo-500"
                            />

                            <div className="mt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={()=>{
                                        setOcrDocument(null);
                                        setOcrText('');
                                    }}
                                    className="h-10 px-4 rounded-xl border border-slate-200 text-sm font-semibold"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="button"
                                    disabled={
                                        !ocrText.trim() ||
                                        ocrMutation.isPending
                                    }
                                    onClick={()=>
                                        ocrMutation.mutate()
                                    }
                                    className="h-10 px-5 rounded-xl bg-indigo-600 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                                >
                                    {ocrMutation.isPending && (
                                        <LoaderCircle className="w-4 h-4 animate-spin"/>
                                    )}

                                    Guardar OCR
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
