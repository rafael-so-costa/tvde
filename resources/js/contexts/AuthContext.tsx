import {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from 'react';
import api, {
    AUTH_EXPIRED_EVENT,
} from '../lib/api';
import type {
    AuthUser,
    LoginPayload,
} from '../types/auth';

interface AuthContextValue {
    user: AuthUser | null;
    loading: boolean;
    login: (
        payload: LoginPayload
    ) => Promise<void>;
    logout: () => Promise<void>;
    refresh: () => Promise<void>;
}

const AuthContext =
    createContext<AuthContextValue | null>(
        null
    );

export function AuthProvider({
    children,
}: {
    children: ReactNode;
}) {
    const [user, setUser] =
        useState<AuthUser | null>(null);

    const [loading, setLoading] =
        useState(true);

    async function refresh(): Promise<void> {
        try {
            const response =
                await api.get('/api/user');

            setUser(
                response.data.user
            );
        } catch {
            setUser(null);
        }
    }

    async function login(
        payload: LoginPayload
    ): Promise<void> {
        await api.get(
            '/sanctum/csrf-cookie'
        );

        const response =
            await api.post(
                '/login',
                payload
            );

        setUser(
            response.data.user
        );
    }

    async function logout(): Promise<void> {
        await api.post('/logout');
        setUser(null);
    }

    useEffect(()=>{
        const handleExpiredSession=()=>{
            setUser(null);
        };

        window.addEventListener(
            AUTH_EXPIRED_EVENT,
            handleExpiredSession,
        );

        return()=>{
            window.removeEventListener(
                AUTH_EXPIRED_EVENT,
                handleExpiredSession,
            );
        };
    },[]);

    useEffect(() => {
        refresh()
            .finally(() =>
                setLoading(false)
            );
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                login,
                logout,
                refresh,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const context =
        useContext(AuthContext);

    if (!context) {
        throw new Error(
            'useAuth deve ser usado dentro de AuthProvider.'
        );
    }

    return context;
}
