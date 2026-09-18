import {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from 'react';
import {
    useQueryClient,
} from '@tanstack/react-query';
import api from '../lib/api';
import type {
    Tenant,
} from '../types/auth';
import {
    useAuth,
} from './AuthContext';

interface TenantContextValue {
    tenants: Tenant[];
    tenant: Tenant | null;
    loading: boolean;
    selectTenant: (
        tenantId: string
    ) => Promise<void>;
    clearTenant: () => Promise<void>;
    refreshTenant: () => Promise<void>;
}

const TenantContext =
    createContext<TenantContextValue | null>(
        null
    );

export function TenantProvider({
    children,
}: {
    children: ReactNode;
}) {
    const {
        user,
    } = useAuth();

    const queryClient =
        useQueryClient();

    const [tenants, setTenants] =
        useState<Tenant[]>([]);

    const [tenant, setTenant] =
        useState<Tenant | null>(null);

    const [loading, setLoading] =
        useState(true);

    async function refreshTenant(): Promise<void> {
        if (!user) {
            setTenants([]);
            setTenant(null);
            setLoading(false);

            return;
        }

        setLoading(true);

        try {
            const optionsResponse =
                await api.get(
                    '/api/tenant-options'
                );

            const options: Tenant[] =
                optionsResponse.data.data ?? [];

            setTenants(options);

            try {
                const contextResponse =
                    await api.get(
                        '/api/tenant-context'
                    );

                const tenantId: string | null =
                    contextResponse.data
                        .tenant_id ?? null;

                setTenant(
                    options.find(
                        (item) =>
                            item.id ===
                            tenantId
                    ) ?? null
                );
            } catch {
                setTenant(null);
            }
        } catch {
            setTenants([]);
            setTenant(null);
        } finally {
            setLoading(false);
        }
    }

    async function selectTenant(
        tenantId: string
    ): Promise<void> {
        await api.get(
            '/sanctum/csrf-cookie'
        );

        const response =
            await api.post(
                '/api/tenant-context',
                {
                    tenant_id:
                        tenantId,
                }
            );

        setTenant(
            response.data.data
        );

        queryClient.clear();
    }

    async function clearTenant(): Promise<void> {
        await api.get(
            '/sanctum/csrf-cookie'
        );

        await api.delete(
            '/api/tenant-context'
        );

        setTenant(null);

        queryClient.clear();
    }

    useEffect(() => {
        refreshTenant();
    }, [user?.id]);

    return (
        <TenantContext.Provider
            value={{
                tenants,
                tenant,
                loading,
                selectTenant,
                clearTenant,
                refreshTenant,
            }}
        >
            {children}
        </TenantContext.Provider>
    );
}

export function useTenant(): TenantContextValue {
    const context =
        useContext(TenantContext);

    if (!context) {
        throw new Error(
            'useTenant deve ser usado dentro de TenantProvider.'
        );
    }

    return context;
}
