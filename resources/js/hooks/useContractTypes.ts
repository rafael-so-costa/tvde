import { useQuery } from "@tanstack/react-query";
import api from "../lib/api";
import { useTenant } from "../contexts/TenantContext";
import type { TipoContrato } from "../types/tipo-contrato";

interface UseContractTypesOptions {
    enabled?: boolean;
    menuOnly?: boolean;
    includeInactive?: boolean;
}

export function useContractTypes(
    options: UseContractTypesOptions = {},
) {
    const { tenant } = useTenant();

    const {
        enabled = true,
        menuOnly = false,
        includeInactive = false,
    } = options;

    return useQuery({
        queryKey: [
            "tipos-contrato",
            tenant?.id,
            menuOnly,
            includeInactive,
        ],

        enabled:
            Boolean(tenant?.id) &&
            enabled,

        queryFn: async () => {
            const response = await api.get(
                "/api/tipos-contrato",
                {
                    params: {
                        menu: menuOnly
                            ? 1
                            : undefined,

                        incluir_inativos:
                            includeInactive
                                ? 1
                                : undefined,
                    },
                },
            );

            return response.data.data as TipoContrato[];
        },
    });
}

export function useContractType(
    id: string | null,
    enabled = true,
) {
    const { tenant } = useTenant();

    return useQuery({
        queryKey: [
            "tipo-contrato",
            tenant?.id,
            id,
        ],

        enabled:
            Boolean(
                tenant?.id &&
                id &&
                enabled,
            ),

        queryFn: async () => {
            const response = await api.get(
                `/api/tipos-contrato/${id}`,
            );

            return response.data.data as TipoContrato;
        },
    });
}
