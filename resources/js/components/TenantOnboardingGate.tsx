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
    useQuery,
} from "@tanstack/react-query";

import api from "../lib/api";

import {
    useTenant,
} from "../contexts/TenantContext";

interface OnboardingStatus {
    required: boolean;
    completed_at: string | null;
}

export default function TenantOnboardingGate() {
    const location =
        useLocation();

    const {
        tenant,
        loading: tenantLoading,
    } = useTenant();

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
                    .data as OnboardingStatus;
            },
        });

    if (tenantLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <LoaderCircle className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (!tenant) {
        return <Outlet />;
    }

    if (query.isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <LoaderCircle className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (query.isError) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
                <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center">
                    <AlertCircle className="w-10 h-10 mx-auto text-red-500" />

                    <h1 className="mt-4 text-lg font-bold text-slate-950">
                        Não foi possível validar a configuração
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        Não foi possível consultar o estado inicial da organização.
                    </p>

                    <button
                        type="button"
                        onClick={() =>
                            query.refetch()
                        }
                        className="mt-6 h-10 px-4 rounded-xl bg-indigo-600 text-sm font-semibold text-white"
                    >
                        Tentar novamente
                    </button>
                </div>
            </div>
        );
    }

    const required =
        query.data?.required ??
        false;

    if (
        required &&
        location.pathname !==
            "/onboarding"
    ) {
        return (
            <Navigate
                to="/onboarding"
                replace
            />
        );
    }

    if (
        !required &&
        location.pathname ===
            "/onboarding"
    ) {
        return (
            <Navigate
                to="/painel"
                replace
            />
        );
    }

    return <Outlet />;
}
