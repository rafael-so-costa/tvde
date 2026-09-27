import {
    Navigate,
    Outlet,
    useLocation,
} from "react-router-dom";

import {
    AlertCircle,
    LoaderCircle,
} from "lucide-react";

import {
    usePortalIdentity,
} from "../hooks/usePortalIdentity";

export default function ManagementRoute(){
    const location=
        useLocation();

    const {
        identity,
        hasArea,
        isLoading,
        isFetching,
        isError,
        refetch,
    }=usePortalIdentity();

    if(
        isLoading ||
        (
            isFetching &&
            !identity
        )
    ){
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <LoaderCircle className="w-8 h-8 animate-spin text-indigo-600"/>
            </div>
        );
    }

    if(isError){
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
                <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center">
                    <AlertCircle className="w-10 h-10 mx-auto text-red-500"/>

                    <h1 className="mt-4 text-lg font-bold text-slate-950">
                        Não foi possível validar o acesso
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        Não foi possível confirmar a área disponível para esta conta.
                    </p>

                    <button
                        type="button"
                        onClick={()=>
                            refetch()
                        }
                        className="mt-6 h-10 px-4 rounded-xl bg-indigo-600 text-sm font-semibold text-white"
                    >
                        Tentar novamente
                    </button>
                </div>
            </div>
        );
    }

    if(
        hasArea(
            "gestao"
        )
    ){
        return <Outlet/>;
    }

    if(
        identity?.default_path &&
        identity.default_path!==
            location.pathname
    ){
        return (
            <Navigate
                to={
                    identity
                        .default_path
                }
                replace
            />
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center">
                <AlertCircle className="w-10 h-10 mx-auto text-amber-500"/>

                <h1 className="mt-4 text-lg font-bold text-slate-950">
                    Área de gestão indisponível
                </h1>

                <p className="mt-2 text-sm text-slate-500">
                    Esta conta não possui acesso à área de gestão nesta organização.
                </p>
            </div>
        </div>
    );
}
