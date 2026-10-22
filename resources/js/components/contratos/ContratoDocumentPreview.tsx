import {useEffect,useState} from "react";
import axios from "axios";
import {Eye,LoaderCircle,RefreshCw,X} from "lucide-react";
import api from "../../lib/api";

interface Props{
    payload:Record<string,unknown>;
    onClose:()=>void;
    title?:string;
}

async function getErrorMessage(error:unknown):Promise<string>{
    if(axios.isAxiosError(error)){
        const data=error.response?.data;

        if(data instanceof Blob){
            try{
                const result=JSON.parse(await data.text());

                if(result.errors && typeof result.errors==="object"){
                    const first=Object.values(result.errors)
                        .flat()
                        .find(value=>typeof value==="string");

                    if(typeof first==="string"){
                        return first;
                    }
                }

                if(typeof result.message==="string"){
                    return result.message;
                }
            }catch{
                return "Nao foi possivel gerar o PDF.";
            }
        }

        return error.message || "Nao foi possivel gerar o PDF.";
    }

    return error instanceof Error
        ? error.message
        : "Nao foi possivel gerar o PDF.";
}

export default function ContratoDocumentPreview({
    payload,
    onClose,
    title="Pré-visualização do contrato",
}:Props){
    /*
     * Captura os dados no momento em que o
     * utilizador abre o preview.
     *
     * Evita requisicoes repetidas se o wizard
     * voltar a renderizar com novo objeto payload.
     */
    const [requestPayload]=useState(()=>payload);

    const [pdfUrl,setPdfUrl]=useState<string|null>(null);
    const [loading,setLoading]=useState(true);
    const [error,setError]=useState<string|null>(null);
    const [revision,setRevision]=useState(0);

    useEffect(()=>{
        let cancelled=false;
        let createdUrl:string|null=null;

        setLoading(true);
        setError(null);
        setPdfUrl(null);

        void (async()=>{
            try{
                const response=await api.post<Blob>(
                    "/api/contratos/preview-pdf",
                    requestPayload,
                    {
                        responseType:"blob",
                        headers:{
                            Accept:"application/pdf",
                        },
                    },
                );

                const blob=response.data;

                if(
                    !(blob instanceof Blob) ||
                    blob.size<1000
                ){
                    throw new Error(
                        "O servidor devolveu um PDF invalido.",
                    );
                }

                const pdfBlob=new Blob(
                    [blob],
                    {type:"application/pdf"},
                );

                createdUrl=URL.createObjectURL(pdfBlob);

                if(!cancelled){
                    setPdfUrl(createdUrl);
                }
            }catch(exception){
                if(!cancelled){
                    setError(await getErrorMessage(exception));
                }
            }finally{
                if(!cancelled){
                    setLoading(false);
                }
            }
        })();

        return ()=>{
            cancelled=true;

            if(createdUrl){
                URL.revokeObjectURL(createdUrl);
            }
        };
    },[requestPayload,revision]);

    useEffect(()=>{
        const onKeyDown=(event:KeyboardEvent)=>{
            if(event.key==="Escape"){
                event.preventDefault();
                onClose();
            }
        };

        window.addEventListener("keydown",onKeyDown);

        return ()=>{
            window.removeEventListener("keydown",onKeyDown);
        };
    },[onClose]);

    return(
        <div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="fixed inset-0 z-[160] flex flex-col bg-slate-950/80 p-2 sm:p-5"
        >
            <div className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-slate-100 shadow-2xl">
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
                    <div className="flex items-center gap-3">
                        <Eye className="h-5 w-5 text-indigo-600"/>
                        <div>
                            <h2 className="font-semibold text-slate-950">
                                {title}
                            </h2>
                            <p className="text-xs text-slate-500">
                                PDF A4 temporario, sem atribuir numero.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={()=>setRevision(value=>value+1)}
                            disabled={loading}
                            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 disabled:opacity-50"
                        >
                            <RefreshCw className="h-4 w-4"/>
                            Atualizar
                        </button>

                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white"
                        >
                            <X className="h-4 w-4"/>
                            Fechar e editar
                        </button>
                    </div>
                </header>

                <main className="min-h-0 flex-1 overflow-hidden bg-slate-200">
                    {loading && (
                        <div className="flex h-full flex-col items-center justify-center gap-3">
                            <LoaderCircle className="h-8 w-8 animate-spin text-indigo-600"/>
                            <p className="text-sm text-slate-600">
                                A gerar o documento com a paginação definitiva...
                            </p>
                        </div>
                    )}

                    {!loading && error && (
                        <div className="mx-auto mt-8 max-w-2xl rounded-xl border border-red-200 bg-white p-6">
                            <p className="font-semibold text-red-700">
                                Não foi possível apresentar o PDF.
                            </p>
                            <p className="mt-2 text-sm text-slate-600">
                                {error}
                            </p>
                            <button
                                type="button"
                                onClick={()=>setRevision(value=>value+1)}
                                className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
                            >
                                Tentar novamente
                            </button>
                        </div>
                    )}

                    {!loading && !error && pdfUrl && (
                        <iframe
                            key={pdfUrl}
                            title="Pré-visualização PDF do contrato"
                            src={pdfUrl}
                            className="h-full w-full border-0 bg-white"
                        />
                    )}
                </main>

                <footer className="border-t border-slate-200 bg-white px-5 py-3 text-xs text-slate-500">
                    Documento provisório. Feche para corrigir os dados antes de criar o contrato.
                </footer>
            </div>
        </div>
    );
}
