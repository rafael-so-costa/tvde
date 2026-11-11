import { useState } from "react";
import { createRoot } from "react-dom/client";
import {
    QueryClient,
    QueryClientProvider,
} from "@tanstack/react-query";

import { AuthProvider } from
    "../../resources/js/contexts/AuthContext";

import { TenantProvider } from
    "../../resources/js/contexts/TenantContext";

import ContractWizard from
    "../../resources/js/components/contratos/wizard/ContractWizard";

import type { Empresa } from
    "../../resources/js/types/empresa";

import type { Motorista } from
    "../../resources/js/types/motorista";

import "../../resources/css/app.css";

declare global {
    interface Window {
        __RGPD_FAKE_SUCCESS__?: boolean;
    }
}

window.__RGPD_FAKE_SUCCESS__ = false;

const company = {
    id: "empresa-fixture",
    tenant_id: "tenant-fixture",
    nome_empresa: "Empresa Fictícia TVDE",
    nif: "000000000",
    email: "empresa@example.invalid",
    ativo: true,
    status_cadastro: "ativo",
} as Empresa;

const driver = {
    id: "motorista-fixture",
    tenant_id: "tenant-fixture",
    nome_completo: "Motorista de Teste",
    email: "motorista@example.invalid",
    nif: "000000001",
    ativo: true,
    status_cadastro: "ativo",
} as Motorista;

const client = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
            refetchOnWindowFocus: false,
        },
    },
});

function Harness() {
    const [open, setOpen] = useState(true);

    return (
        <QueryClientProvider client={client}>
            <AuthProvider>
                <TenantProvider>
                    <ContractWizard
                        open={open}
                        initialTypeId="rgpd-fixture"
                        empresas={[company]}
                        motoristas={[driver]}
                        proprietarios={[]}
                        veiculos={[]}
                        onClose={() => setOpen(false)}
                        onSuccess={() => {
                            window.__RGPD_FAKE_SUCCESS__ = true;
                        }}
                    />
                </TenantProvider>
            </AuthProvider>
        </QueryClientProvider>
    );
}

const container = document.getElementById("app");

if (!container) {
    throw new Error("Elemento app nao encontrado.");
}

createRoot(container).render(<Harness />);