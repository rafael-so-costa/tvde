import axios from "axios";

import {
    useMemo,
    useState,
} from "react";

import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";

import {
    AlertCircle,
    KeyRound,
    LoaderCircle,
    Pencil,
    Plus,
    RefreshCw,
    Search,
    ShieldCheck,
    UserCog,
} from "lucide-react";

import {
    useTenant,
} from "../contexts/TenantContext";

import {
    useCurrentPermissions,
} from "../hooks/useCurrentPermissions";

import {
    createFuncionario,
    fetchFuncionarios,
    provisionFuncionarioAccess,
    resendFuncionarioInvite,
    updateFuncionario,
    updateFuncionarioAccess,
    updateFuncionarioEstado,
} from "../lib/funcionarios";

import type {
    Funcionario,
    FuncionarioEstado,
    FuncionarioPayload,
} from "../types/funcionario";

import FuncionarioFormModal
    from "../components/funcionarios/FuncionarioFormModal";

import FuncionarioPermissionsModal
    from "../components/funcionarios/FuncionarioPermissionsModal";

const stateLabels:Record<
    FuncionarioEstado,
    string
>={
    ativo:"Ativo",
    inativo:"Inativo",
    suspenso:"Suspenso",
    desligado:"Desligado",
};

export default function FuncionariosPage(){
    const {tenant}=useTenant();

    const {
        can,
        canManageEmployeePermissions,
    }=useCurrentPermissions();

    const queryClient=
        useQueryClient();

    const [search,setSearch]=
        useState("");

    const [
        editing,
        setEditing,
    ]=useState<Funcionario | null>(
        null
    );

    const [
        formOpen,
        setFormOpen,
    ]=useState(false);

    const [
        permissionsEmployee,
        setPermissionsEmployee,
    ]=useState<Funcionario | null>(
        null
    );

    const query=useQuery({
        queryKey:[
            "funcionarios",
            tenant?.id,
        ],

        enabled:Boolean(
            tenant?.id
        ),

        queryFn:
            fetchFuncionarios,
    });

    async function invalidate(){
        await queryClient
            .invalidateQueries({
                queryKey:[
                    "funcionarios",
                    tenant?.id,
                ],
            });
    }

    const createMutation=
        useMutation({
            mutationFn:
                createFuncionario,

            onSuccess:
                invalidate,
        });

    const updateMutation=
        useMutation({
            mutationFn:({
                id,
                payload,
            }:{
                id:string;
                payload:FuncionarioPayload;
            })=>
                updateFuncionario(
                    id,
                    payload
                ),

            onSuccess:
                invalidate,
        });

    const accessMutation=
        useMutation({
            mutationFn:async(
                funcionario:Funcionario
            )=>{
                try{
                    return await provisionFuncionarioAccess(
                        funcionario.id,
                        false
                    );
                }catch(error){
                    if(
                        axios.isAxiosError(
                            error
                        ) &&
                        error.response
                            ?.status===422 &&
                        error.response
                            ?.data
                            ?.errors
                            ?.existing_user
                    ){
                        const confirmed=
                            window.confirm(
                                "Já existe uma conta FrotaPRO com este e-mail. Pretende associá-la explicitamente a este funcionário?"
                            );

                        if(!confirmed){
                            throw error;
                        }

                        return provisionFuncionarioAccess(
                            funcionario.id,
                            true
                        );
                    }

                    throw error;
                }
            },

            onSuccess:
                invalidate,
        });

    const filtered=
        useMemo(()=>{
            const items=
                query.data?.data ??
                [];

            const term=
                search
                    .trim()
                    .toLocaleLowerCase(
                        "pt-PT"
                    );

            if(!term){
                return items;
            }

            return items.filter(
                item=>
                    [
                        item.nome,
                        item.nif,
                        item.email,
                        item.cargo,
                        item.departamento,
                        item.numero_funcionario,
                    ]
                        .filter(Boolean)
                        .some(
                            value=>
                                String(value)
                                    .toLocaleLowerCase(
                                        "pt-PT"
                                    )
                                    .includes(
                                        term
                                    )
                        )
            );
        },[
            query.data,
            search,
        ]);

    async function handleSave(
        payload:FuncionarioPayload,
        estado?:FuncionarioEstado
    ){
        if(editing){
            await updateMutation
                .mutateAsync({
                    id:editing.id,
                    payload,
                });

            if(
                estado &&
                estado!==
                    editing.estado
            ){
                await updateFuncionarioEstado(
                    editing.id,
                    estado
                );

                await invalidate();
            }
        }else{
            await createMutation
                .mutateAsync(
                    payload
                );
        }

        setFormOpen(false);
        setEditing(null);
    }

    if(!tenant){
        return (
            <div className="mx-auto max-w-7xl">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
                    Selecione uma organização.
                </div>
            </div>
        );
    }

    const canConfigure=
        can(
            "funcionarios",
            "configurar"
        );

    return (
        <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                    <p className="mb-2 text-sm font-medium text-indigo-600">
                        Organização
                    </p>

                    <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                        Funcionários
                    </h1>

                    <p className="mt-2 text-slate-500">
                        Cadastro laboral, acessos e permissões de {tenant.nome}.
                    </p>
                </div>

                {canConfigure && (
                    <button
                        type="button"
                        onClick={()=>{
                            setEditing(null);
                            setFormOpen(true);
                        }}
                        className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white"
                    >
                        <Plus className="h-5 w-5"/>
                        Novo funcionário
                    </button>
                )}
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/>

                        <input
                            value={search}
                            onChange={event=>
                                setSearch(
                                    event.target.value
                                )
                            }
                            placeholder="Pesquisar funcionário..."
                            className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-indigo-500"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={()=>
                            query.refetch()
                        }
                        className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-medium"
                    >
                        <RefreshCw className={[
                            "h-4 w-4",
                            query.isFetching
                                ? "animate-spin"
                                : "",
                        ].join(" ")}/>

                        Atualizar
                    </button>
                </div>

                {query.isLoading ? (
                    <div className="flex justify-center py-20">
                        <LoaderCircle className="h-8 w-8 animate-spin text-indigo-600"/>
                    </div>
                ) : query.isError ? (
                    <div className="py-16 text-center">
                        <AlertCircle className="mx-auto h-9 w-9 text-red-500"/>
                        <p className="mt-3 text-sm text-slate-500">
                            Não foi possível carregar os funcionários.
                        </p>
                    </div>
                ) : filtered.length===0 ? (
                    <div className="py-20 text-center text-sm text-slate-400">
                        Nenhum funcionário encontrado.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b border-slate-200 bg-slate-50">
                                <tr>
                                    <th className="px-5 py-3 text-xs uppercase text-slate-500">
                                        Funcionário
                                    </th>
                                    <th className="px-5 py-3 text-xs uppercase text-slate-500">
                                        Função
                                    </th>
                                    <th className="px-5 py-3 text-xs uppercase text-slate-500">
                                        Estado
                                    </th>
                                    <th className="px-5 py-3 text-xs uppercase text-slate-500">
                                        Acesso
                                    </th>
                                    <th className="px-5 py-3 text-right text-xs uppercase text-slate-500">
                                        Ações
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {filtered.map(
                                    funcionario=>(
                                        <tr
                                            key={
                                                funcionario.id
                                            }
                                        >
                                            <td className="px-5 py-4">
                                                <div className="font-semibold text-slate-900">
                                                    {funcionario.nome}
                                                </div>

                                                <div className="mt-1 text-xs text-slate-400">
                                                    {funcionario.email ?? "Sem e-mail"}
                                                </div>
                                            </td>

                                            <td className="px-5 py-4 text-sm text-slate-600">
                                                {funcionario.cargo ?? "—"}

                                                {funcionario.departamento && (
                                                    <div className="mt-1 text-xs text-slate-400">
                                                        {funcionario.departamento}
                                                    </div>
                                                )}
                                            </td>

                                            <td className="px-5 py-4">
                                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                                                    {stateLabels[
                                                        funcionario.estado
                                                    ]}
                                                </span>
                                            </td>

                                            <td className="px-5 py-4 text-sm">
                                                {funcionario.access.linked
                                                    ? (
                                                        <span className={
                                                            funcionario.access.tenant_status===
                                                            "ativo"
                                                                ? "text-emerald-600"
                                                                : "text-amber-600"
                                                        }>
                                                            {funcionario.access.tenant_status===
                                                            "ativo"
                                                                ? "Ativo"
                                                                : "Suspenso"}
                                                        </span>
                                                    )
                                                    : funcionario
                                                        .access
                                                        .pending_invitation
                                                        ? (
                                                            <span className="text-blue-600">
                                                                Convite pendente
                                                            </span>
                                                        )
                                                        : (
                                                            <span className="text-slate-400">
                                                                Sem acesso
                                                            </span>
                                                        )}
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex justify-end gap-2">
                                                    {canConfigure && (
                                                        <button
                                                            type="button"
                                                            title="Editar"
                                                            onClick={()=>{
                                                                setEditing(
                                                                    funcionario
                                                                );
                                                                setFormOpen(
                                                                    true
                                                                );
                                                            }}
                                                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200"
                                                        >
                                                            <Pencil className="h-4 w-4"/>
                                                        </button>
                                                    )}

                                                    {canConfigure &&
                                                        !funcionario
                                                            .access
                                                            .linked &&
                                                        !funcionario
                                                            .access
                                                            .pending_invitation && (
                                                        <button
                                                            type="button"
                                                            title="Dar acesso"
                                                            onClick={()=>
                                                                accessMutation
                                                                    .mutate(
                                                                        funcionario
                                                                    )
                                                            }
                                                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-indigo-600"
                                                        >
                                                            <KeyRound className="h-4 w-4"/>
                                                        </button>
                                                    )}

                                                    {canConfigure &&
                                                        funcionario
                                                            .access
                                                            .pending_invitation && (
                                                        <button
                                                            type="button"
                                                            title="Reenviar convite"
                                                            onClick={async()=>{
                                                                await resendFuncionarioInvite(
                                                                    funcionario.id
                                                                );
                                                                await invalidate();
                                                            }}
                                                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-blue-600"
                                                        >
                                                            <KeyRound className="h-4 w-4"/>
                                                        </button>
                                                    )}

                                                    {canConfigure &&
                                                        funcionario
                                                            .access
                                                            .linked && (
                                                        <button
                                                            type="button"
                                                            title={
                                                                funcionario
                                                                    .access
                                                                    .tenant_status===
                                                                "ativo"
                                                                    ? "Suspender acesso"
                                                                    : "Reativar acesso"
                                                            }
                                                            onClick={async()=>{
                                                                await updateFuncionarioAccess(
                                                                    funcionario.id,
                                                                    funcionario
                                                                        .access
                                                                        .tenant_status!==
                                                                    "ativo"
                                                                );
                                                                await invalidate();
                                                            }}
                                                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-amber-600"
                                                        >
                                                            <UserCog className="h-4 w-4"/>
                                                        </button>
                                                    )}

                                                    {canManageEmployeePermissions &&
                                                        funcionario
                                                            .access
                                                            .linked && (
                                                        <button
                                                            type="button"
                                                            title="Permissões"
                                                            onClick={()=>
                                                                setPermissionsEmployee(
                                                                    funcionario
                                                                )
                                                            }
                                                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-emerald-600"
                                                        >
                                                            <ShieldCheck className="h-4 w-4"/>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <FuncionarioFormModal
                open={formOpen}
                funcionario={editing}
                submitting={
                    createMutation.isPending ||
                    updateMutation.isPending
                }
                onClose={()=>{
                    setFormOpen(false);
                    setEditing(null);
                }}
                onSubmit={handleSave}
            />

            <FuncionarioPermissionsModal
                funcionario={
                    permissionsEmployee
                }
                onClose={()=>
                    setPermissionsEmployee(
                        null
                    )
                }
            />
        </div>
    );
}
