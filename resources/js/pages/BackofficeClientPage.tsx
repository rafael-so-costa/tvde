import axios from "axios";
import {
    ArrowLeft,
    Building2,
    CalendarDays,
    Car,
    CheckCircle2,
    LoaderCircle,
    Mail,
    Phone,
    Power,
    ShieldCheck,
    UserRound,
    UsersRound,
    AlertTriangle,
    Layers3,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { useState } from "react";

import api from "../lib/api";

import type {
    BackofficeClientDetail,
    BackofficeClientPlanChangeResponse,
    BackofficeClientPlanPreview,
    BackofficePlanListResponse,
    BackofficeResourceUsage,
} from "../types/backoffice";

function errorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        return (
            error.response?.data?.message ??
            "Não foi possível concluir a operação."
        );
    }

    return "Não foi possível concluir a operação.";
}

export default function BackofficeClientPage() {
    const { id } = useParams<{
        id: string;
    }>();

    const queryClient = useQueryClient();

    const [selectedPlanId, setSelectedPlanId] = useState("");

    const clientQuery = useQuery({
        queryKey: ["backoffice", "clientes", id],

        enabled: Boolean(id),

        queryFn: async () => {
            const response = await api.get(`/api/backoffice/clientes/${id}`);

            return response.data.data as BackofficeClientDetail;
        },
    });

    const plansQuery = useQuery({
        queryKey: ["backoffice", "planos", "client-selector"],

        queryFn: async () => {
            const response = await api.get("/api/backoffice/planos");

            return response.data as BackofficePlanListResponse;
        },
    });

    const effectiveSelectedPlanId =
        selectedPlanId || clientQuery.data?.plan?.id || "";

    const planPreviewQuery = useQuery({
        queryKey: [
            "backoffice",
            "clientes",
            id,
            "plano-preview",
            effectiveSelectedPlanId,
        ],

        enabled: Boolean(
            id &&
            effectiveSelectedPlanId &&
            effectiveSelectedPlanId !== clientQuery.data?.plan?.id,
        ),

        queryFn: async () => {
            const response = await api.get(
                `/api/backoffice/clientes/${id}/plano-preview`,
                {
                    params: {
                        plan_id: effectiveSelectedPlanId,
                    },
                },
            );

            return response.data.data as BackofficeClientPlanPreview;
        },
    });

    const statusMutation = useMutation({
        mutationFn: async (ativo: boolean) => {
            const response = await api.patch(
                `/api/backoffice/clientes/${id}/estado`,
                {
                    ativo,
                },
            );

            return response.data;
        },

        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: ["backoffice", "clientes", id],
                }),

                queryClient.invalidateQueries({
                    queryKey: ["backoffice", "clientes"],
                }),

                queryClient.invalidateQueries({
                    queryKey: ["backoffice", "dashboard"],
                }),
            ]);
        },
    });

    const multiCompanyMutation = useMutation({
        mutationFn: async (enabled: boolean | null) => {
            const response = await api.patch(
                `/api/backoffice/clientes/${id}/multiempresa`,
                {
                    enabled,
                },
            );

            return response.data as {
                message: string;

                data: {
                    id: string;
                    multi_company_enabled: boolean;
                    multi_company_override: boolean | null;
                };
            };
        },

        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: ["backoffice", "clientes", id],
                }),

                queryClient.invalidateQueries({
                    queryKey: ["backoffice", "clientes"],
                }),
            ]);
        },
    });

    const planMutation = useMutation({
        mutationFn: async (planId: string) => {
            const response = await api.patch(
                `/api/backoffice/clientes/${id}/plano`,
                {
                    plan_id: planId,
                },
            );

            return response.data as BackofficeClientPlanChangeResponse;
        },

        onSuccess: async (response) => {
            setSelectedPlanId(response.data.plan.id);

            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: ["backoffice", "clientes", id],
                }),

                queryClient.invalidateQueries({
                    queryKey: ["backoffice", "clientes"],
                }),

                queryClient.invalidateQueries({
                    queryKey: ["backoffice", "planos"],
                }),

                queryClient.invalidateQueries({
                    queryKey: ["backoffice", "dashboard"],
                }),
            ]);
        },
    });

    if (clientQuery.isLoading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <LoaderCircle className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (clientQuery.isError || !clientQuery.data) {
        return (
            <div className="mx-auto max-w-7xl">
                <Link
                    to="/backoffice/clientes"
                    className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar aos clientes
                </Link>

                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
                    Não foi possível carregar este cliente.
                </div>
            </div>
        );
    }

    const client = clientQuery.data;

    const plans = plansQuery.data?.data ?? [];

    const availablePlans = plans.filter(
        (plan) => plan.ativo || plan.id === client.plan?.id,
    );

    const planSelectionChanged = Boolean(
        effectiveSelectedPlanId && effectiveSelectedPlanId !== client.plan?.id,
    );

    const selectedPlan =
        plans.find((plan) => plan.id === effectiveSelectedPlanId) ?? null;

    async function changeStatus(): Promise<void> {
        const nextStatus = !client.ativo;

        const confirmed = window.confirm(
            nextStatus
                ? `Ativar o cliente "${client.nome}"?`
                : `Inativar o cliente "${client.nome}"? O acesso à organização ficará indisponível para os seus utilizadores.`,
        );

        if (!confirmed) {
            return;
        }

        await statusMutation.mutateAsync(nextStatus);
    }

    function setMultiCompanyOverride(value: boolean | null): void {
        if (multiCompanyMutation.isPending) {
            return;
        }

        multiCompanyMutation.mutate(value);
    }

    async function changePlan(): Promise<void> {
        if (
            !effectiveSelectedPlanId ||
            !planSelectionChanged ||
            planMutation.isPending ||
            !planPreviewQuery.data
        ) {
            return;
        }

        const warnings = planPreviewQuery.data.impact.warnings;

        const warningText =
            warnings.length > 0
                ? `\n\nAtenção: ${warnings.length} recurso(s) ficarão acima do limite do novo plano. Nenhum dado será apagado, mas novas criações ficarão bloqueadas enquanto o uso estiver acima do limite.`
                : "";

        const confirmed = window.confirm(
            `Alterar o plano de "${client.nome}" de "${client.plan?.nome ?? "Sem plano"}" para "${selectedPlan?.nome ?? "plano selecionado"}"?${warningText}`,
        );

        if (!confirmed) {
            return;
        }

        await planMutation.mutateAsync(effectiveSelectedPlanId);
    }

    return (
        <div className="mx-auto max-w-7xl space-y-7">
            <section>
                <Link
                    to="/backoffice/clientes"
                    className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 transition hover:text-indigo-700"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Clientes
                </Link>

                <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                    <div>
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                                {client.nome}
                            </h1>

                            <span
                                className={[
                                    "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                                    client.ativo
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "bg-red-50 text-red-700",
                                ].join(" ")}
                            >
                                {client.ativo
                                    ? "Cliente ativo"
                                    : "Cliente inativo"}
                            </span>
                        </div>

                        <p className="mt-2 text-slate-500">
                            Gestão administrativa da conta SaaS.
                        </p>
                    </div>

                    <button
                        type="button"
                        disabled={statusMutation.isPending}
                        onClick={changeStatus}
                        className={[
                            "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition disabled:opacity-60",
                            client.ativo
                                ? "border border-red-200 bg-white text-red-600 hover:bg-red-50"
                                : "bg-emerald-600 text-white hover:bg-emerald-700",
                        ].join(" ")}
                    >
                        {statusMutation.isPending ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                            <Power className="h-4 w-4" />
                        )}

                        {client.ativo ? "Inativar cliente" : "Ativar cliente"}
                    </button>
                </div>

                {statusMutation.isError && (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {errorMessage(statusMutation.error)}
                    </div>
                )}
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                <MetricCard
                    label="Utilizadores"
                    value={client.users_count}
                    icon={UsersRound}
                />

                <MetricCard
                    label="Empresas"
                    value={client.empresas_count}
                    icon={Building2}
                />

                <MetricCard
                    label="Proprietários"
                    value={client.proprietarios_count}
                    icon={UsersRound}
                />

                <MetricCard
                    label="Veículos"
                    value={client.veiculos_count}
                    icon={Car}
                />

                <MetricCard
                    label="Motoristas"
                    value={client.motoristas_count}
                    icon={UserRound}
                />

                <MetricCard
                    label="Funcionários"
                    value={client.funcionarios_count}
                    icon={ShieldCheck}
                />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-2xl border border-slate-200 bg-white">
                    <div className="border-b border-slate-100 px-5 py-4">
                        <h2 className="font-semibold text-slate-900">
                            Dados do cliente
                        </h2>
                    </div>

                    <div className="grid gap-5 p-5 sm:grid-cols-2">
                        <Info label="Nome" value={client.nome} />

                        <Info label="NIF" value={client.nif} />

                        <Info label="E-mail" value={client.email} icon={Mail} />

                        <Info
                            label="Telefone"
                            value={client.telefone}
                            icon={Phone}
                        />

                        <Info label="Slug" value={client.slug} />

                        <Info
                            label="Criado em"
                            value={formatDateTime(client.created_at)}
                            icon={CalendarDays}
                        />
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white">
                    <div className="border-b border-slate-100 px-5 py-4">
                        <h2 className="font-semibold text-slate-900">
                            Configuração SaaS
                        </h2>
                    </div>

                    <div className="space-y-5 p-5">
                        <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500">
                                        Plano atual
                                    </p>

                                    <p className="mt-2 font-semibold text-slate-900">
                                        {client.plan?.nome ?? "Sem plano"}
                                    </p>

                                    {client.plan?.descricao && (
                                        <p className="mt-1 text-xs leading-5 text-slate-500">
                                            {client.plan.descricao}
                                        </p>
                                    )}
                                </div>

                                {client.plan && (
                                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold uppercase text-indigo-600">
                                        {client.plan.codigo}
                                    </span>
                                )}
                            </div>

                            <div className="mt-4 border-t border-indigo-100 pt-4">
                                <label className="block">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Alterar plano
                                    </span>

                                    <select
                                        value={effectiveSelectedPlanId}
                                        disabled={
                                            plansQuery.isLoading ||
                                            planMutation.isPending
                                        }
                                        onChange={(event) =>
                                            setSelectedPlanId(
                                                event.target.value,
                                            )
                                        }
                                        className="mt-2 h-11 w-full rounded-xl border border-indigo-100 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:opacity-60"
                                    >
                                        {!client.plan && (
                                            <option value="">
                                                Selecione um plano
                                            </option>
                                        )}

                                        {availablePlans.map((plan) => (
                                            <option
                                                key={plan.id}
                                                value={plan.id}
                                                disabled={
                                                    !plan.ativo &&
                                                    plan.id !== client.plan?.id
                                                }
                                            >
                                                {plan.nome}
                                                {!plan.ativo
                                                    ? " — inativo"
                                                    : ""}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <p className="mt-2 text-xs text-slate-400">
                                    A alteração só será aplicada após análise do
                                    impacto e confirmação.
                                </p>
                            </div>
                        </div>

                        <ConfigurationRow
                            title="Onboarding"
                            value={
                                client.onboarding_required
                                    ? "Pendente"
                                    : "Concluído"
                            }
                            positive={!client.onboarding_required}
                        />

                        <div className="border-t border-slate-100 pt-4">
                            <div className="flex flex-col gap-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-sm font-medium text-slate-700">
                                            Multiempresa
                                        </p>

                                        <p className="mt-1 text-xs text-slate-400">
                                            Permite cadastrar mais de uma
                                            empresa nesta organização.
                                        </p>
                                    </div>

                                    <div className="text-right">
                                        <span
                                            className={[
                                                "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                                                client.multi_company_enabled
                                                    ? "bg-emerald-50 text-emerald-700"
                                                    : "bg-slate-100 text-slate-600",
                                            ].join(" ")}
                                        >
                                            {client.multi_company_enabled
                                                ? "Ativado"
                                                : "Desativado"}
                                        </span>

                                        <p className="mt-1 text-xs text-slate-400">
                                            {client.feature_overrides
                                                .multi_company === null
                                                ? "Definido pelo plano"
                                                : client.feature_overrides
                                                        .multi_company
                                                  ? "Override ativo"
                                                  : "Override inativo"}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid gap-2 sm:grid-cols-3">
                                    <OverrideButton
                                        label="Usar plano"
                                        selected={
                                            client.feature_overrides
                                                .multi_company === null
                                        }
                                        disabled={
                                            multiCompanyMutation.isPending
                                        }
                                        onClick={() =>
                                            setMultiCompanyOverride(null)
                                        }
                                    />

                                    <OverrideButton
                                        label="Forçar ativo"
                                        selected={
                                            client.feature_overrides
                                                .multi_company === true
                                        }
                                        disabled={
                                            multiCompanyMutation.isPending
                                        }
                                        onClick={() =>
                                            setMultiCompanyOverride(true)
                                        }
                                    />

                                    <OverrideButton
                                        label="Forçar inativo"
                                        selected={
                                            client.feature_overrides
                                                .multi_company === false
                                        }
                                        disabled={
                                            multiCompanyMutation.isPending
                                        }
                                        onClick={() =>
                                            setMultiCompanyOverride(false)
                                        }
                                    />
                                </div>

                                {multiCompanyMutation.isPending && (
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                                        A guardar configuração...
                                    </div>
                                )}

                                {multiCompanyMutation.isError && (
                                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                        {errorMessage(
                                            multiCompanyMutation.error,
                                        )}
                                    </div>
                                )}

                                {multiCompanyMutation.isSuccess && (
                                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                                        {multiCompanyMutation.data.message}
                                    </div>
                                )}
                            </div>
                        </div>

                        <ConfigurationRow
                            title="Estado da conta"
                            value={client.ativo ? "Ativa" : "Inativa"}
                            positive={client.ativo}
                        />

                        {client.onboarding_completed_at && (
                            <div className="border-t border-slate-100 pt-4">
                                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                                    Onboarding concluído
                                </p>

                                <p className="mt-1 text-sm font-medium text-slate-700">
                                    {formatDateTime(
                                        client.onboarding_completed_at,
                                    )}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {planSelectionChanged && (
                <section className="overflow-hidden rounded-2xl border border-indigo-200 bg-white">
                    <div className="flex flex-col justify-between gap-4 border-b border-indigo-100 bg-indigo-50/50 px-5 py-4 sm:flex-row sm:items-center">
                        <div>
                            <div className="flex items-center gap-2">
                                <Layers3 className="h-5 w-5 text-indigo-600" />

                                <h2 className="font-semibold text-slate-900">
                                    Pré-visualização da alteração
                                </h2>
                            </div>

                            <p className="mt-1 text-sm text-slate-500">
                                Veja o impacto efetivo antes de alterar o plano
                                deste cliente.
                            </p>
                        </div>

                        {selectedPlan && (
                            <div className="text-sm text-slate-500">
                                <span className="font-semibold text-slate-900">
                                    {client.plan?.nome ?? "Sem plano"}
                                </span>

                                <span className="mx-2">→</span>

                                <span className="font-semibold text-indigo-600">
                                    {selectedPlan.nome}
                                </span>
                            </div>
                        )}
                    </div>

                    {planPreviewQuery.isLoading ? (
                        <div className="flex min-h-48 items-center justify-center">
                            <LoaderCircle className="h-7 w-7 animate-spin text-indigo-600" />
                        </div>
                    ) : planPreviewQuery.isError ? (
                        <div className="p-5">
                            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                Não foi possível calcular o impacto do novo
                                plano.
                            </div>
                        </div>
                    ) : planPreviewQuery.data ? (
                        <>
                            {planPreviewQuery.data.impact.warnings.length >
                                0 && (
                                <div className="border-b border-amber-100 bg-amber-50 px-5 py-4">
                                    <div className="flex gap-3">
                                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

                                        <div>
                                            <p className="text-sm font-semibold text-amber-800">
                                                O cliente ficará acima de um ou
                                                mais limites
                                            </p>

                                            <p className="mt-1 text-sm leading-6 text-amber-700">
                                                Nenhum dado existente será
                                                removido. Novas criações nesses
                                                recursos ficarão bloqueadas até
                                                que a utilização volte ao limite
                                                permitido.
                                            </p>

                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {planPreviewQuery.data.impact.warnings.map(
                                                    (warning) => (
                                                        <span
                                                            key={
                                                                warning.resource
                                                            }
                                                            className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-800"
                                                        >
                                                            {resourceLabel(
                                                                warning.resource,
                                                            )}
                                                            : {warning.used}{" "}
                                                            utilizados /{" "}
                                                            {warning.limit}{" "}
                                                            permitidos (+
                                                            {warning.excess})
                                                        </span>
                                                    ),
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="p-5">
                                <h3 className="text-sm font-semibold text-slate-900">
                                    Limites após a alteração
                                </h3>

                                <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                    <UsageCard
                                        label="Empresas"
                                        usage={
                                            planPreviewQuery.data.impact.usage
                                                .empresas
                                        }
                                    />

                                    <UsageCard
                                        label="Veículos"
                                        usage={
                                            planPreviewQuery.data.impact.usage
                                                .veiculos
                                        }
                                    />

                                    <UsageCard
                                        label="Motoristas"
                                        usage={
                                            planPreviewQuery.data.impact.usage
                                                .motoristas
                                        }
                                    />

                                    <UsageCard
                                        label="Utilizadores"
                                        usage={
                                            planPreviewQuery.data.impact.usage
                                                .utilizadores
                                        }
                                    />
                                </div>

                                <h3 className="mt-6 text-sm font-semibold text-slate-900">
                                    Funcionalidades após a alteração
                                </h3>

                                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                    <FeatureCard
                                        label="Multiempresa"
                                        enabled={
                                            planPreviewQuery.data.impact
                                                .features.multi_company
                                        }
                                    />

                                    <FeatureCard
                                        label="Integrações"
                                        enabled={
                                            planPreviewQuery.data.impact
                                                .features.integracoes
                                        }
                                    />

                                    <FeatureCard
                                        label="Relatórios avançados"
                                        enabled={
                                            planPreviewQuery.data.impact
                                                .features.relatorios_avancados
                                        }
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col justify-between gap-4 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center">
                                <p className="text-xs leading-5 text-slate-500">
                                    Overrides administrativos existentes serão
                                    preservados.
                                </p>

                                <button
                                    type="button"
                                    disabled={planMutation.isPending}
                                    onClick={changePlan}
                                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                                >
                                    {planMutation.isPending ? (
                                        <LoaderCircle className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Layers3 className="h-4 w-4" />
                                    )}
                                    Confirmar alteração para{" "}
                                    {selectedPlan?.nome}
                                </button>
                            </div>
                        </>
                    ) : null}
                </section>
            )}

            {planMutation.isError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {errorMessage(planMutation.error)}
                </div>
            )}

            {planMutation.isSuccess && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {planMutation.data.message}
                </div>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-5 py-4">
                    <h2 className="font-semibold text-slate-900">
                        Utilização do plano
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                        Consumo atual dos recursos sujeitos aos limites SaaS.
                    </p>
                </div>

                <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
                    <UsageCard label="Empresas" usage={client.usage.empresas} />

                    <UsageCard label="Veículos" usage={client.usage.veiculos} />

                    <UsageCard
                        label="Motoristas"
                        usage={client.usage.motoristas}
                    />

                    <UsageCard
                        label="Utilizadores"
                        usage={client.usage.utilizadores}
                    />
                </div>

                <div className="border-t border-slate-100 p-5">
                    <h3 className="text-sm font-semibold text-slate-900">
                        Funcionalidades
                    </h3>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <FeatureCard
                            label="Multiempresa"
                            enabled={client.features.multi_company}
                        />

                        <FeatureCard
                            label="Integrações"
                            enabled={client.features.integracoes}
                        />

                        <FeatureCard
                            label="Relatórios avançados"
                            enabled={client.features.relatorios_avancados}
                        />
                    </div>
                </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-5 py-4">
                    <h2 className="font-semibold text-slate-900">Empresas</h2>

                    <p className="mt-1 text-sm text-slate-500">
                        Empresas vinculadas a esta organização.
                    </p>
                </div>

                {client.companies.length === 0 ? (
                    <EmptyState text="Nenhuma empresa vinculada." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b border-slate-200 bg-slate-50">
                                <tr>
                                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Empresa
                                    </th>

                                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Contacto
                                    </th>

                                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Localização
                                    </th>

                                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Estado
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {client.companies.map((company) => (
                                    <tr key={company.id}>
                                        <td className="px-5 py-4">
                                            <div className="font-semibold text-slate-900">
                                                {company.nome_empresa}
                                            </div>

                                            <div className="mt-1 text-xs text-slate-400">
                                                NIF {company.nif}
                                            </div>
                                        </td>

                                        <td className="px-5 py-4 text-sm text-slate-600">
                                            <div>{company.email ?? "—"}</div>

                                            {company.telemovel && (
                                                <div className="mt-1 text-xs text-slate-400">
                                                    {company.telemovel}
                                                </div>
                                            )}
                                        </td>

                                        <td className="px-5 py-4 text-sm text-slate-600">
                                            {company.endereco_cidade ?? "—"}
                                        </td>

                                        <td className="px-5 py-4">
                                            <span
                                                className={[
                                                    "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                                                    company.ativo
                                                        ? "bg-emerald-50 text-emerald-700"
                                                        : "bg-slate-100 text-slate-600",
                                                ].join(" ")}
                                            >
                                                {company.status_cadastro}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-5 py-4">
                    <h2 className="font-semibold text-slate-900">
                        Utilizadores
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                        Contas com acesso a esta organização.
                    </p>
                </div>

                {client.users.length === 0 ? (
                    <EmptyState text="Nenhum utilizador vinculado." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b border-slate-200 bg-slate-50">
                                <tr>
                                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Utilizador
                                    </th>

                                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Perfil
                                    </th>

                                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Acesso
                                    </th>

                                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Último login
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {client.users.map((user) => (
                                    <tr key={user.id}>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 font-semibold text-indigo-600">
                                                    {user.name
                                                        .charAt(0)
                                                        .toUpperCase()}
                                                </div>

                                                <div>
                                                    <div className="flex items-center gap-2 font-semibold text-slate-900">
                                                        {user.name}

                                                        {user.principal && (
                                                            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-600">
                                                                Principal
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="mt-1 text-xs text-slate-400">
                                                        {user.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-5 py-4">
                                            <div className="flex flex-wrap gap-1.5">
                                                {user.roles.length > 0 ? (
                                                    user.roles.map((role) => (
                                                        <span
                                                            key={role.codigo}
                                                            className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                                                        >
                                                            {role.nome}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-sm text-slate-400">
                                                        Sem role
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        <td className="px-5 py-4">
                                            <div className="flex flex-col items-start gap-1">
                                                <span
                                                    className={[
                                                        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                                                        user.ativo &&
                                                        user.membership_status ===
                                                            "ativo"
                                                            ? "bg-emerald-50 text-emerald-700"
                                                            : "bg-red-50 text-red-700",
                                                    ].join(" ")}
                                                >
                                                    {user.ativo &&
                                                    user.membership_status ===
                                                        "ativo"
                                                        ? "Ativo"
                                                        : "Inativo"}
                                                </span>

                                                {user.membership_status !==
                                                    "ativo" && (
                                                    <span className="text-xs text-slate-400">
                                                        {user.membership_status}
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        <td className="px-5 py-4 text-sm text-slate-500">
                                            {user.last_login_at
                                                ? formatDateTime(
                                                      user.last_login_at,
                                                  )
                                                : "Nunca"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}

function MetricCard({
    label,
    value,
    icon: Icon,
}: {
    label: string;
    value: number;
    icon: typeof Building2;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Icon className="h-5 w-5" />
            </div>

            <div className="mt-4 text-2xl font-bold text-slate-950">
                {value}
            </div>

            <div className="mt-1 text-sm text-slate-500">{label}</div>
        </div>
    );
}

function Info({
    label,
    value,
    icon: Icon,
}: {
    label: string;
    value: string | null;
    icon?: typeof Mail;
}) {
    return (
        <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                {label}
            </p>

            <div className="mt-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                {Icon && <Icon className="h-4 w-4 text-slate-400" />}

                <span>{value || "—"}</span>
            </div>
        </div>
    );
}

function OverrideButton({
    label,
    selected,
    disabled,
    onClick,
}: {
    label: string;
    selected: boolean;
    disabled: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className={[
                "h-9 rounded-lg border px-3 text-xs font-semibold transition disabled:opacity-50",
                selected
                    ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-600",
            ].join(" ")}
        >
            {label}
        </button>
    );
}

function ConfigurationRow({
    title,
    value,
    positive,
}: {
    title: string;
    value: string;
    positive: boolean;
}) {
    return (
        <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-slate-500">{title}</span>

            <div className="flex items-center gap-2">
                <CheckCircle2
                    className={[
                        "h-4 w-4",
                        positive ? "text-emerald-500" : "text-slate-300",
                    ].join(" ")}
                />

                <span className="text-sm font-semibold text-slate-700">
                    {value}
                </span>
            </div>
        </div>
    );
}

function UsageCard({
    label,
    usage,
}: {
    label: string;
    usage: BackofficeResourceUsage;
}) {
    return (
        <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-medium text-slate-500">{label}</p>

            <div className="mt-2 flex items-end gap-1">
                <span className="text-2xl font-bold text-slate-950">
                    {usage.used}
                </span>

                <span className="pb-0.5 text-sm text-slate-400">
                    / {usage.limit ?? "∞"}
                </span>
            </div>

            <p className="mt-2 text-xs text-slate-400">
                {usage.limit === null
                    ? "Sem limite definido"
                    : usage.can_create
                      ? `${usage.remaining} disponíveis`
                      : "Limite atingido"}
            </p>
        </div>
    );
}

function FeatureCard({ label, enabled }: { label: string; enabled: boolean }) {
    return (
        <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
            <span className="text-sm font-medium text-slate-700">{label}</span>

            <span
                className={[
                    "rounded-full px-2.5 py-1 text-xs font-semibold",
                    enabled
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500",
                ].join(" ")}
            >
                {enabled ? "Disponível" : "Indisponível"}
            </span>
        </div>
    );
}

function EmptyState({ text }: { text: string }) {
    return (
        <div className="px-6 py-12 text-center text-sm text-slate-400">
            {text}
        </div>
    );
}

function resourceLabel(resource: string): string {
    const labels: Record<string, string> = {
        empresas: "Empresas",
        veiculos: "Veículos",
        motoristas: "Motoristas",
        utilizadores: "Utilizadores",
    };

    return labels[resource] ?? resource;
}

function formatDateTime(value: string): string {
    return new Intl.DateTimeFormat("pt-PT", {
        dateStyle: "short",
        timeStyle: "short",
    }).format(new Date(value));
}
