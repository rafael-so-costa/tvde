import {useQuery} from "@tanstack/react-query";
import {useAuth} from "../contexts/AuthContext";
import {useTenant} from "../contexts/TenantContext";
import {
    getPortalIdentity,
    PortalAreaCode,
} from "../lib/portal";

export type {
    PortalArea,
    PortalAreaCode,
    PortalIdentity,
    PortalLink,
    ProprietarioPortalLink,
} from "../lib/portal";

export function usePortalIdentity(){
    const {user}=useAuth();

    const {
        tenant,
        loading:tenantLoading,
    }=useTenant();

    const query=useQuery({
        queryKey:[
            "portal-identity",
            user?.id,
            tenant?.id??"sem-tenant",
        ],

        enabled:
            Boolean(user) &&
            !tenantLoading,

        queryFn:
            getPortalIdentity,

        staleTime:
            30_000,
    });

    const identity=
        query.data??null;

    function hasArea(
        area:PortalAreaCode
    ):boolean{
        return Boolean(
            identity?.areas.some(
                item=>
                    item.code===area
            )
        );
    }

    return {
        ...query,
        identity,
        hasArea,
    };
}
