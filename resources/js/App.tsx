import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AppShell from "./layouts/AppShell";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import ModulePlaceholderPage from "./pages/ModulePlaceholderPage";
import EmpresasPage from "./pages/EmpresasPage";
import ProprietariosPage from "./pages/ProprietariosPage";
import VeiculosPage from "./pages/VeiculosPage";
import MotoristasPage from "./pages/MotoristasPage";
import ChecklistsPage from "./pages/ChecklistsPage";

export default function App() {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<ProtectedRoute />}>
                <Route element={<AppShell />}>
                    <Route index element={<DashboardPage />} />

                    <Route path="empresas" element={<EmpresasPage />} />

                    <Route
                        path="proprietarios"
                        element={<ProprietariosPage />}
                    />

                    <Route path="motoristas" element={<MotoristasPage />} />

                    <Route path="veiculos" element={<VeiculosPage />} />

                    <Route path="checklists" element={<ChecklistsPage />} />

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

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
