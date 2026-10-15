import axios from "axios";
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

    const [errors,setErrors]=
        useState<
            Record<string,string[]>
        >({});

    const [
        generalError,
        setGeneralError,
    ]=useState("");

    useEffect(()=>{
        if(!open){
            return;
        }

        setErrors({});
        setGeneralError("");

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

        if(errors[field]){
            setErrors(
                current=>({
                    ...current,
                    [field]:[],
                })
            );
        }
    }

    function focusFirstValidationError(
        validationErrors:
            Record<string,string[]>
    ){
        const firstField=
            Object.keys(
                validationErrors
            )[0];

        if(!firstField){
            return;
        }

        requestAnimationFrame(()=>{
            requestAnimationFrame(()=>{
                const marker=
                    Array.from(
                        document
                            .querySelectorAll<HTMLElement>(
                                "[data-field-error]"
                            )
                    ).find(
                        element=>
                            element.dataset
                                .fieldError===
                            firstField
                    );

                const control=
                    marker
                        ?.parentElement
                        ?.querySelector<HTMLElement>(
                            "input, select, textarea"
                        );

                (
                    control ??
                    marker
                )?.scrollIntoView({
                    behavior:"smooth",
                    block:"center",
                });

                control?.focus();
            });
        });
    }

    function fieldError(
        field:keyof FuncionarioPayload
    ):string | undefined{
        return errors[field]?.[0];
    }

    async function submit(
        event:FormEvent
    ){
        event.preventDefault();

        setErrors({});
        setGeneralError("");

        try{
            await onSubmit(
                form,
                funcionario
                    ? estado
                    : undefined
            );
        }catch(error){
            if(
                axios.isAxiosError(
                    error
                )
            ){
                const response=
                    error.response
                        ?.data;

                const validationErrors=
                    response?.errors ??
                    {};

                setErrors(
                    validationErrors
                );

                if(
                    Object.keys(
                        validationErrors
                    ).length>0
                ){
                    setGeneralError(
                        "Existem dados inválidos. Corrija os campos assinalados."
                    );

                    focusFirstValidationError(
                        validationErrors
                    );
                }else{
                    setGeneralError(
                        response?.message ??
                        "Não foi possível guardar o funcionário."
                    );
                }
            }else{
                setGeneralError(
                    "Não foi possível guardar o funcionário."
                );
            }
        }
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

                {generalError && (
                    <div className="mx-6 mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        {generalError}
                    </div>
                )}

                <div className="grid gap-4 p-6 sm:grid-cols-2">
                    <Field
                        field="nome"
                        label="Nome"
                        value={
                            form.nome
                        }
                        required
                        error={
                            fieldError(
                                "nome"
                            )
                        }
                        onChange={value=>
                            set(
                                "nome",
                                value
                            )
                        }
                    />

                    <Field
                        field="numero_funcionario"
                        label="N.º funcionário"
                        value={
                            form
                                .numero_funcionario ??
                            ""
                        }
                        error={
                            fieldError(
                                "numero_funcionario"
                            )
                        }
                        onChange={value=>
                            set(
                                "numero_funcionario",
                                value
                            )
                        }
                    />

                    <Field
                        field="nif"
                        label="NIF"
                        value={
                            form.nif ?? ""
                        }
                        error={
                            fieldError(
                                "nif"
                            )
                        }
                        onChange={value=>
                            set(
                                "nif",
                                value
                            )
                        }
                    />

                    <Field
                        field="email"
                        label="E-mail"
                        type="email"
                        value={
                            form.email ??
                            ""
                        }
                        error={
                            fieldError(
                                "email"
                            )
                        }
                        onChange={value=>
                            set(
                                "email",
                                value
                            )
                        }
                    />

                    <Field
                        field="telefone"
                        label="Telefone"
                        value={
                            form.telefone ??
                            ""
                        }
                        error={
                            fieldError(
                                "telefone"
                            )
                        }
                        onChange={value=>
                            set(
                                "telefone",
                                value
                            )
                        }
                    />

                    <Field
                        field="data_nascimento"
                        label="Nascimento"
                        type="date"
                        value={
                            form
                                .data_nascimento ??
                            ""
                        }
                        error={
                            fieldError(
                                "data_nascimento"
                            )
                        }
                        onChange={value=>
                            set(
                                "data_nascimento",
                                value
                            )
                        }
                    />

                    <Field
                        field="cargo"
                        label="Cargo"
                        value={
                            form.cargo ?? ""
                        }
                        error={
                            fieldError(
                                "cargo"
                            )
                        }
                        onChange={value=>
                            set(
                                "cargo",
                                value
                            )
                        }
                    />

                    <Field
                        field="departamento"
                        label="Departamento"
                        value={
                            form
                                .departamento ??
                            ""
                        }
                        error={
                            fieldError(
                                "departamento"
                            )
                        }
                        onChange={value=>
                            set(
                                "departamento",
                                value
                            )
                        }
                    />

                    <Field
                        field="data_admissao"
                        label="Data de admissão"
                        type="date"
                        value={
                            form
                                .data_admissao ??
                            ""
                        }
                        error={
                            fieldError(
                                "data_admissao"
                            )
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
                            className={[
                                "w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:ring-4",
                                fieldError(
                                    "observacoes"
                                )
                                    ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
                                    : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10",
                            ].join(" ")}
                        />

                        {fieldError(
                            "observacoes"
                        ) && (
                            <p
                                data-field-error="observacoes"
                                className="mt-1.5 text-xs text-red-600"
                            >
                                {fieldError(
                                    "observacoes"
                                )}
                            </p>
                        )}
                    </div>
                </div>

                <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
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
    field,
    label,
    value,
    type="text",
    required=false,
    error,
    onChange,
}:{
    field:keyof FuncionarioPayload;
    label:string;
    value:string;
    type?:string;
    required?:boolean;
    error?:string;
    onChange:(value:string)=>void;
}){
    return (
        <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                {label}
                {required && " *"}
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
                className={[
                    "h-11 w-full rounded-xl border px-3 text-sm outline-none transition focus:ring-4",
                    error
                        ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
                        : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10",
                ].join(" ")}
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