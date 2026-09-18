import {
    Navigate,
    Route,
    Routes,
} from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AppShell from './layouts/AppShell';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import ModulePlaceholderPage from './pages/ModulePlaceholderPage';

export default function App() {
    return (
        <Routes>
            <Route
                path="/login"
                element={<LoginPage />}
            />

            <Route
                element={
                    <ProtectedRoute />
                }
            >
                <Route
                    element={
                        <AppShell />
                    }
                >
                    <Route
                        index
                        element={
                            <DashboardPage />
                        }
                    />

                    <Route
                        path="empresas"
                        element={
                            <ModulePlaceholderPage
                                title="Empresas"
                                description="Gestão das empresas da organização."
                            />
                        }
                    />

                    <Route
                        path="proprietarios"
                        element={
                            <ModulePlaceholderPage
                                title="Proprietários"
                                description="Gestão de proprietários e contas de acesso."
                            />
                        }
                    />

                    <Route
                        path="motoristas"
                        element={
                            <ModulePlaceholderPage
                                title="Motoristas"
                                description="Gestão de motoristas e respetivas contas."
                            />
                        }
                    />

                    <Route
                        path="veiculos"
                        element={
                            <ModulePlaceholderPage
                                title="Veículos"
                                description="Gestão da frota de veículos."
                            />
                        }
                    />

                    <Route
                        path="alugueres"
                        element={
                            <ModulePlaceholderPage
                                title="Alugueres"
                                description="Gestão operacional dos alugueres."
                            />
                        }
                    />

                    <Route
                        path="contratos"
                        element={
                            <ModulePlaceholderPage
                                title="Contratos"
                                description="Contratos, versões e assinaturas digitais."
                            />
                        }
                    />

                    <Route
                        path="templates"
                        element={
                            <ModulePlaceholderPage
                                title="Templates"
                                description="Templates e perfis de contratos."
                            />
                        }
                    />
                </Route>
            </Route>

            <Route
                path="*"
                element={
                    <Navigate
                        to="/"
                        replace
                    />
                }
            />
        </Routes>
    );
}
