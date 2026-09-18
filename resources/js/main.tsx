import React from 'react';
import ReactDOM from 'react-dom/client';
import {
    BrowserRouter,
} from 'react-router-dom';
import {
    QueryClient,
    QueryClientProvider,
} from '@tanstack/react-query';
import App from './App';
import {
    AuthProvider,
} from './contexts/AuthContext';
import {
    TenantProvider,
} from './contexts/TenantContext';

const queryClient =
    new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60000,
                refetchOnWindowFocus:
                    false,
                retry: 1,
            },
        },
    });

ReactDOM.createRoot(
    document.getElementById(
        'app'
    )!
).render(
    <React.StrictMode>
        <QueryClientProvider
            client={queryClient}
        >
            <BrowserRouter>
                <AuthProvider>
                    <TenantProvider>
                        <App />
                    </TenantProvider>
                </AuthProvider>
            </BrowserRouter>
        </QueryClientProvider>
    </React.StrictMode>
);
