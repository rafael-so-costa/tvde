import {
    useEffect,
    useState,
} from "react";

import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";

import {
    LoaderCircle,
    Save,
    X,
} from "lucide-react";

import {
    fetchFuncionarioPermissions,
    saveFuncionarioPermissions,
} from "../../lib/funcionarios";

import type {
    Funcionario,
    PermissionLevel,
} from "../../types/funcionario";

interface Props {
    funcionario:Funcionario | null;
    onClose:()=>void;
}

export default function FuncionarioPermissionsModal({
    funcionario,
    onClose,
}:Props){
    const queryClient=
        useQueryClient();

    const [levels,setLevels]=
        useState<Record<
            string,
            PermissionLevel | null
        >>({});

    const query=useQuery({
        queryKey:[
            "funcionario-permissions",
            funcionario?.id,
        ],

        enabled:Boolean(
            funcionario?.id
        ),

        queryFn:()=>
            fetchFuncionarioPermissions(
                funcionario!.id
            ),
    });

    useEffect(()=>{
        if(!query.data){
            return;
        }

        setLevels(
            Object.fromEntries(
                query.data.map(
                    item=>[
                        item.codigo,
                        item.nivel_direto,
                    ]
                )
            )
        );
    },[
        query.data,
    ]);

    const mutation=
        useMutation({
            mutationFn:()=>
                saveFuncionarioPermissions(
                    funcionario!.id,
                    levels
                ),

            onSuccess:async()=>{
                await queryClient
                    .invalidateQueries({
                        queryKey:[
                            "funcionario-permissions",
                            funcionario?.id,
                        ],
                    });

                onClose();
            },
        });

    if(!funcionario){
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
                type="button"
                onClick={onClose}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />

            <div className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
                <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
                    <div>
                        <h2 className="text-xl font-semibold text-slate-950">
                            Permissões
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            {funcionario.nome}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                    >
                        <X className="h-5 w-5 text-slate-400"/>
                    </button>
                </div>

                {query.isLoading ? (
                    <div className="flex justify-center py-16">
                        <LoaderCircle className="h-7 w-7 animate-spin text-indigo-600"/>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {query.data?.map(
                            item=>(
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between gap-4 px-6 py-4"
                                >
                                    <div>
                                        <div className="text-sm font-semibold text-slate-800">
                                            {item.nome}
                                        </div>

                                        <div className="mt-1 text-xs text-slate-400">
                                            Efetivo:{" "}
                                            {item.nivel_efetivo}
                                        </div>
                                    </div>

                                    <select
                                        value={
                                            levels[
                                                item.codigo
                                            ] ??
                                            ""
                                        }
                                        onChange={event=>{
                                            const value=
                                                event.target.value;

                                            setLevels(
                                                current=>({
                                                    ...current,

                                                    [item.codigo]:
                                                        value===""
                                                            ? null
                                                            : value as PermissionLevel,
                                                })
                                            );
                                        }}
                                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
                                    >
                                        <option value="">
                                            Herdar
                                        </option>

                                        <option value="nenhum">
                                            Nenhum
                                        </option>

                                        <option value="visualizar">
                                            Visualizar
                                        </option>

                                        <option value="configurar">
                                            Configurar
                                        </option>
                                    </select>
                                </div>
                            )
                        )}
                    </div>
                )}

                <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold"
                    >
                        Cancelar
                    </button>

                    <button
                        type="button"
                        disabled={
                            mutation.isPending
                        }
                        onClick={()=>
                            mutation.mutate()
                        }
                        className="flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
                    >
                        {mutation.isPending
                            ? (
                                <LoaderCircle className="h-4 w-4 animate-spin"/>
                            )
                            : (
                                <Save className="h-4 w-4"/>
                            )}

                        Guardar
                    </button>
                </div>
            </div>
        </div>
    );
}
