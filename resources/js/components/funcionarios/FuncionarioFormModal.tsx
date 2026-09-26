import {
    FormEvent,
    useEffect,
    useState,
} from "react";

import {
    LoaderCircle,
    X,
} from "lucide-react";

import type {
    Funcionario,
    FuncionarioPayload,
    FuncionarioEstado,
} from "../../types/funcionario";

interface Props {
    open:boolean;
    funcionario:Funcionario | null;
    submitting:boolean;

    onClose:()=>void;

    onSubmit:(
        payload:FuncionarioPayload,
        estado?:FuncionarioEstado,
    )=>Promise<void>;
}

const empty:FuncionarioPayload={
    numero_funcionario:null,
    nome:"",
    nif:null,
    email:null,
    telefone:null,
    data_nascimento:null,
    cargo:null,
    departamento:null,
    data_admissao:null,
    observacoes:null,
};

export default function FuncionarioFormModal({
    open,
    funcionario,
    submitting,
    onClose,
    onSubmit,
}:Props){
    const [form,setForm]=
        useState<FuncionarioPayload>(
            empty
        );

    const [estado,setEstado]=
        useState<FuncionarioEstado>(
            "ativo"
        );

    useEffect(()=>{
        if(!open){
            return;
        }

        if(funcionario){
            setForm({
                numero_funcionario:
                    funcionario
                        .numero_funcionario,

                nome:
                    funcionario.nome,

                nif:
                    funcionario.nif,

                email:
                    funcionario.email,

                telefone:
                    funcionario.telefone,

                data_nascimento:
                    funcionario
                        .data_nascimento,

                cargo:
                    funcionario.cargo,

                departamento:
                    funcionario
                        .departamento,

                data_admissao:
                    funcionario
                        .data_admissao,

                observacoes:
                    funcionario
                        .observacoes,
            });

            setEstado(
                funcionario.estado
            );
        }else{
            setForm(empty);
            setEstado("ativo");
        }
    },[
        open,
        funcionario,
    ]);

    if(!open){
        return null;
    }

    function set(
        field:keyof FuncionarioPayload,
        value:string,
    ){
        setForm(
            current=>({
                ...current,
                [field]:
                    value || null,
            })
        );
    }

    async function submit(
        event:FormEvent
    ){
        event.preventDefault();

        await onSubmit(
            form,
            funcionario
                ? estado
                : undefined
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
                type="button"
                aria-label="Fechar"
                onClick={onClose}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />

            <form
                onSubmit={submit}
                className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            >
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
                    <div>
                        <h2 className="text-xl font-semibold text-slate-950">
                            {funcionario
                                ? "Editar funcionário"
                                : "Novo funcionário"}
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Dados laborais da organização.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
                    >
                        <X className="h-5 w-5"/>
                    </button>
                </div>

                <div className="grid gap-4 p-6 sm:grid-cols-2">
                    <Field
                        label="Nome"
                        value={form.nome}
                        required
                        onChange={value=>
                            set(
                                "nome",
                                value
                            )
                        }
                    />

                    <Field
                        label="N.º funcionário"
                        value={
                            form
                                .numero_funcionario ??
                            ""
                        }
                        onChange={value=>
                            set(
                                "numero_funcionario",
                                value
                            )
                        }
                    />

                    <Field
                        label="NIF"
                        value={
                            form.nif ?? ""
                        }
                        onChange={value=>
                            set(
                                "nif",
                                value
                            )
                        }
                    />

                    <Field
                        label="E-mail"
                        type="email"
                        value={
                            form.email ??
                            ""
                        }
                        onChange={value=>
                            set(
                                "email",
                                value
                            )
                        }
                    />

                    <Field
                        label="Telefone"
                        value={
                            form.telefone ??
                            ""
                        }
                        onChange={value=>
                            set(
                                "telefone",
                                value
                            )
                        }
                    />

                    <Field
                        label="Nascimento"
                        type="date"
                        value={
                            form
                                .data_nascimento ??
                            ""
                        }
                        onChange={value=>
                            set(
                                "data_nascimento",
                                value
                            )
                        }
                    />

                    <Field
                        label="Cargo"
                        value={
                            form.cargo ?? ""
                        }
                        onChange={value=>
                            set(
                                "cargo",
                                value
                            )
                        }
                    />

                    <Field
                        label="Departamento"
                        value={
                            form
                                .departamento ??
                            ""
                        }
                        onChange={value=>
                            set(
                                "departamento",
                                value
                            )
                        }
                    />

                    <Field
                        label="Data de admissão"
                        type="date"
                        value={
                            form
                                .data_admissao ??
                            ""
                        }
                        onChange={value=>
                            set(
                                "data_admissao",
                                value
                            )
                        }
                    />

                    {funcionario && (
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Estado
                            </label>

                            <select
                                value={estado}
                                disabled={
                                    funcionario.estado===
                                    "desligado"
                                }
                                onChange={event=>
                                    setEstado(
                                        event
                                            .target
                                            .value as FuncionarioEstado
                                    )
                                }
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 disabled:bg-slate-50"
                            >
                                <option value="ativo">
                                    Ativo
                                </option>
                                <option value="inativo">
                                    Inativo
                                </option>
                                <option value="suspenso">
                                    Suspenso
                                </option>
                                <option value="desligado">
                                    Desligado
                                </option>
                            </select>
                        </div>
                    )}

                    <div className="sm:col-span-2">
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Observações
                        </label>

                        <textarea
                            rows={4}
                            value={
                                form
                                    .observacoes ??
                                ""
                            }
                            onChange={event=>
                                set(
                                    "observacoes",
                                    event.target.value
                                )
                            }
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700"
                    >
                        Cancelar
                    </button>

                    <button
                        type="submit"
                        disabled={
                            submitting ||
                            !form.nome.trim()
                        }
                        className="flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
                    >
                        {submitting && (
                            <LoaderCircle className="h-4 w-4 animate-spin"/>
                        )}

                        Guardar
                    </button>
                </div>
            </form>
        </div>
    );
}

function Field({
    label,
    value,
    type="text",
    required=false,
    onChange,
}:{
    label:string;
    value:string;
    type?:string;
    required?:boolean;
    onChange:(value:string)=>void;
}){
    return (
        <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {label}
            </label>

            <input
                type={type}
                required={required}
                value={value}
                onChange={event=>
                    onChange(
                        event.target.value
                    )
                }
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            />
        </div>
    );
}
