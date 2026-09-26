import {
    useQuery,
} from "@tanstack/react-query";

import api from "../lib/api";

import {
    useAuth,
} from "../contexts/AuthContext";

import {
    useTenant,
} from "../contexts/TenantContext";

type PermissionLevel =
    | "nenhum"
    | "visualizar"
    | "configurar";

interface PermissionResponse {
    data: Record<
        string,
        PermissionLevel
    >;

    capabilities: {
        manage_employee_permissions:
        boolean;
    };
}

const rank: Record<
    PermissionLevel,
    number
> = {
    nenhum: 0,
    visualizar: 1,
    configurar: 2,
};

export function useCurrentPermissions() {
    const { user } = useAuth();
    const { tenant } = useTenant();

    const query = useQuery({
        queryKey: [
            "current-permissions",
            tenant?.id,
        ],

        enabled: Boolean(
            tenant?.id
        ),

        queryFn: async () => {
            const response =
                await api.get(
                    "/api/permissoes-atuais"
                );

            return response.data as PermissionResponse;
        },
    });

    function can(
        code: string,
        required: PermissionLevel = "visualizar"
    ): boolean {
        if (user?.super_admin) {
            return true;
        }

        if (!query.data) {
            return false;
        }

        const level =
            query.data.data[code] ??
            "nenhum";

        return rank[level] >=
            rank[required];
    }

    return {
        ...query,
        can,

        canManageEmployeePermissions:
            user?.super_admin ||
            query.data
                ?.capabilities
                .manage_employee_permissions ||
            false,
    };
}
