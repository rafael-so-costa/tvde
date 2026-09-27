import axios from "axios";

import {
    FormEvent,
    useEffect,
    useState,
} from "react";

import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";

import {
    Building2,
    CheckCircle2,
    LoaderCircle,
    MapPin,
    ShieldCheck,
    Truck,
} from "lucide-react";

import {
    useNavigate,
} from "react-router-dom";

import api from "../lib/api";

import {
    useTenant,
} from "../contexts/TenantContext";

import type {
    Empresa,
} from "../types/empresa";

interface OnboardingResponse {
    required: boolean;
    completed_at: string | null;
    empresa: Empresa | null;
}

interface FormState {
    company_name: string;
    company_email: string;
    company_phone: string;
    manager_name: string;
    address_street: string;
    address_number: string;
    address_complement: string;
    address_postal_code: string;
    address_city: string;
    certificate_tvde: string;
    certificate_tvde_valid_until: string;
}

const emptyForm: FormState = {
    company_name: "",
    company_email: "",
    company_phone: "",
    manager_name: "",
    address_street: "",
    address_number: "",
    address_complement: "",
    address_postal_code: "",
    address_city: "",
    certificate_tvde: "",
    certificate_tvde_valid_until: "",
};

export default function OnboardingPage() {
    const navigate =
        useNavigate();

    const queryClient =
        useQueryClient();

    const {
        tenant,
        refreshTenant,
    } = useTenant();

    const [
        form,
        setForm,
    ] = useState<FormState>(
        emptyForm
    );

    const [
        errors,
        setErrors,
    ] = useState<
        Record<
            string,
            string[]
        >
    >({});

    const [
        generalError,
        setGeneralError,
    ] = useState("");

    const query =
        useQuery({
            queryKey: [
                "saas-onboarding",
                tenant?.id,
            ],

            enabled:
                Boolean(
                    tenant?.id
                ),

            queryFn: async () => {
                const response =
                    await api.get(
                        "/api/onboarding"
                    );

                return response.data
                    .data as OnboardingResponse;
            },
        });

    useEffect(() => {
        const empresa =
            query.data?.empresa;

        if (!empresa) {
            return;
        }

        setForm({
            company_name:
                empresa.nome_empresa ??
                "",

            company_email:
                empresa.email ??
                "",

            company_phone:
                empresa.telemovel ??
                "",

            manager_name:
                empresa.nome_gerente ??
                "",

            address_street:
                empresa.endereco_rua ??
                "",

            address_number:
                empresa
                    .endereco_numero ??
                "",

            address_complement:
                empresa
                    .endereco_complemento ??
                "",

            address_postal_code:
                empresa.endereco_cep ??
                "",

            address_city:
                empresa
                    .endereco_cidade ??
                "",

            certificate_tvde:
                empresa
                    .certificado_tvde ??
                "",

            certificate_tvde_valid_until:
                empresa
                    .certificado_tvde_valid_until
                    ?.slice(
                        0,
                        10
                    ) ??
                "",
        });
    }, [
        query.data,
    ]);

    const mutation =
        useMutation({
            mutationFn:
                async (
                    payload: FormState
                ) => {
                    const response =
                        await api.patch(
                            "/api/onboarding",
                            {
                                ...payload,

                                address_complement:
                                    payload
                                        .address_complement
                                        .trim() ||
                                    null,

                                certificate_tvde:
                                    payload
                                        .certificate_tvde
                                        .trim() ||
                                    null,

                                certificate_tvde_valid_until:
                                    payload
                                        .certificate_tvde_valid_until ||
                                    null,
                            }
                        );

                    return response
                        .data
                        .data as OnboardingResponse;
                },

            onSuccess:
                async () => {
                    await queryClient
                        .invalidateQueries({
                            queryKey: [
                                "saas-onboarding",
                            ],
                        });

                    await refreshTenant();

                    navigate(
                        "/painel",
                        {
                            replace:
                                true,
                        }
                    );
                },
        });

    function update(
        field:
            keyof FormState,
        value: string
    ) {
        setForm(
            (current) => ({
                ...current,
                [field]: value,
            })
        );

        if (
            errors[field]
        ) {
            setErrors(
                (current) => ({
                    ...current,
                    [field]: [],
                })
            );
        }
    }

    async function submit(
        event: FormEvent
    ) {
        event.preventDefault();

        setErrors({});
        setGeneralError("");

        try {
            await mutation
                .mutateAsync(
                    form
                );
        } catch (error) {
            if (
                axios.isAxiosError(
                    error
                )
            ) {
                const response =
                    error.response
                        ?.data;

                if (
                    response
                        ?.errors
                ) {
                    setErrors(
                        response
                            .errors
                    );
                }

                setGeneralError(
                    response
                        ?.message ??
                    "Não foi possível concluir a configuração."
                );

                return;
            }

            setGeneralError(
                "Não foi possível concluir a configuração."
            );
        }
    }

    if (
        query.isLoading
    ) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <LoaderCircle className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    const empresa =
        query.data?.empresa;

    const fieldClass =
        "w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

    const labelClass =
        "block text-sm font-medium text-slate-700 mb-2";

    function fieldError(
        field: keyof FormState
    ) {
        const message =
            errors[field]?.[0];

        if (!message) {
            return null;
        }

        return (
            <p className="mt-1.5 text-xs text-red-600">
                {message}
            </p>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50">
            <header className="border-b border-slate-200 bg-white">
                <div className="mx-auto max-w-6xl h-20 px-5 sm:px-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
                            <Truck className="w-5 h-5 text-white" />
                        </div>

                        <div>
                            <div className="text-xl font-bold text-slate-950">
                                Frota
                                <span className="text-indigo-600">
                                    PRO
                                </span>
                            </div>

                            <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                                Configuração inicial
                            </div>
                        </div>
                    </div>

                    <div className="hidden sm:flex items-center gap-2 text-sm text-slate-500">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        Ambiente da sua empresa
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-14">
                <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr]">
                    <aside>
                        <p className="text-sm font-semibold text-indigo-600">
                            Primeiros passos
                        </p>

                        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                            Vamos preparar a sua empresa.
                        </h1>

                        <p className="mt-4 leading-7 text-slate-600">
                            Estes dados identificam a empresa dentro do FrotaPRO
                            e serão utilizados nos processos administrativos da operação.
                        </p>

                        <div className="mt-8 space-y-5">
                            <div className="flex gap-3">
                                <CheckCircle2 className="mt-0.5 w-5 h-5 shrink-0 text-emerald-500" />

                                <div>
                                    <p className="font-medium text-slate-900">
                                        Conta criada
                                    </p>

                                    <p className="mt-1 text-sm text-slate-500">
                                        O administrador e a organização já foram configurados.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <Building2 className="mt-0.5 w-5 h-5 shrink-0 text-indigo-500" />

                                <div>
                                    <p className="font-medium text-slate-900">
                                        Dados da empresa
                                    </p>

                                    <p className="mt-1 text-sm text-slate-500">
                                        Complete agora as informações essenciais.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <MapPin className="mt-0.5 w-5 h-5 shrink-0 text-slate-400" />

                                <div>
                                    <p className="font-medium text-slate-900">
                                        Depois, a frota
                                    </p>

                                    <p className="mt-1 text-sm text-slate-500">
                                        Em seguida poderá cadastrar proprietários, veículos e motoristas.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </aside>

                    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                                Organização
                            </p>

                            <h2 className="mt-2 text-2xl font-bold text-slate-950">
                                Dados da empresa
                            </h2>

                            {empresa && (
                                <p className="mt-2 text-sm text-slate-500">
                                    NIF {empresa.nif}
                                </p>
                            )}
                        </div>

                        {generalError && (
                            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                {generalError}
                            </div>
                        )}

                        <form
                            onSubmit={
                                submit
                            }
                            className="mt-8 space-y-8"
                        >
                            <section>
                                <h3 className="font-semibold text-slate-900">
                                    Identificação
                                </h3>

                                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                    <div className="sm:col-span-2">
                                        <label className={labelClass}>
                                            Nome da empresa *
                                        </label>

                                        <input
                                            value={
                                                form.company_name
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                update(
                                                    "company_name",
                                                    event.target.value
                                                )
                                            }
                                            required
                                            className={fieldClass}
                                        />

                                        {fieldError(
                                            "company_name"
                                        )}
                                    </div>

                                    <div>
                                        <label className={labelClass}>
                                            E-mail *
                                        </label>

                                        <input
                                            type="email"
                                            value={
                                                form.company_email
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                update(
                                                    "company_email",
                                                    event.target.value
                                                )
                                            }
                                            required
                                            className={fieldClass}
                                        />

                                        {fieldError(
                                            "company_email"
                                        )}
                                    </div>

                                    <div>
                                        <label className={labelClass}>
                                            Telefone *
                                        </label>

                                        <input
                                            value={
                                                form.company_phone
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                update(
                                                    "company_phone",
                                                    event.target.value
                                                )
                                            }
                                            required
                                            className={fieldClass}
                                        />

                                        {fieldError(
                                            "company_phone"
                                        )}
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className={labelClass}>
                                            Gerente / responsável *
                                        </label>

                                        <input
                                            value={
                                                form.manager_name
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                update(
                                                    "manager_name",
                                                    event.target.value
                                                )
                                            }
                                            required
                                            className={fieldClass}
                                        />

                                        {fieldError(
                                            "manager_name"
                                        )}
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h3 className="font-semibold text-slate-900">
                                    Morada
                                </h3>

                                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                    <div className="sm:col-span-2">
                                        <label className={labelClass}>
                                            Rua *
                                        </label>

                                        <input
                                            value={
                                                form.address_street
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                update(
                                                    "address_street",
                                                    event.target.value
                                                )
                                            }
                                            required
                                            className={fieldClass}
                                        />

                                        {fieldError(
                                            "address_street"
                                        )}
                                    </div>

                                    <div>
                                        <label className={labelClass}>
                                            Número *
                                        </label>

                                        <input
                                            value={
                                                form.address_number
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                update(
                                                    "address_number",
                                                    event.target.value
                                                )
                                            }
                                            required
                                            className={fieldClass}
                                        />

                                        {fieldError(
                                            "address_number"
                                        )}
                                    </div>

                                    <div>
                                        <label className={labelClass}>
                                            Complemento
                                        </label>

                                        <input
                                            value={
                                                form.address_complement
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                update(
                                                    "address_complement",
                                                    event.target.value
                                                )
                                            }
                                            className={fieldClass}
                                        />
                                    </div>

                                    <div>
                                        <label className={labelClass}>
                                            Código postal *
                                        </label>

                                        <input
                                            value={
                                                form.address_postal_code
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                update(
                                                    "address_postal_code",
                                                    event.target.value
                                                )
                                            }
                                            required
                                            className={fieldClass}
                                        />

                                        {fieldError(
                                            "address_postal_code"
                                        )}
                                    </div>

                                    <div>
                                        <label className={labelClass}>
                                            Cidade *
                                        </label>

                                        <input
                                            value={
                                                form.address_city
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                update(
                                                    "address_city",
                                                    event.target.value
                                                )
                                            }
                                            required
                                            className={fieldClass}
                                        />

                                        {fieldError(
                                            "address_city"
                                        )}
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h3 className="font-semibold text-slate-900">
                                    Operador TVDE
                                </h3>

                                <p className="mt-1 text-sm text-slate-500">
                                    Pode completar esta informação agora ou posteriormente.
                                </p>

                                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className={labelClass}>
                                            Certificado TVDE
                                        </label>

                                        <input
                                            value={
                                                form.certificate_tvde
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                update(
                                                    "certificate_tvde",
                                                    event.target.value
                                                )
                                            }
                                            className={fieldClass}
                                        />
                                    </div>

                                    <div>
                                        <label className={labelClass}>
                                            Validade
                                        </label>

                                        <input
                                            type="date"
                                            value={
                                                form.certificate_tvde_valid_until
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                update(
                                                    "certificate_tvde_valid_until",
                                                    event.target.value
                                                )
                                            }
                                            className={fieldClass}
                                        />
                                    </div>
                                </div>
                            </section>

                            <div className="border-t border-slate-200 pt-6">
                                <button
                                    type="submit"
                                    disabled={
                                        mutation.isPending
                                    }
                                    className="w-full sm:w-auto h-12 px-7 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold transition flex items-center justify-center gap-2"
                                >
                                    {mutation.isPending && (
                                        <LoaderCircle className="w-5 h-5 animate-spin" />
                                    )}

                                    Concluir configuração
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            </div>
        </main>
    );
}
