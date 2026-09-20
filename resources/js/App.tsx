import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AppShell from "./layouts/AppShell";
import AlugueresPage from "./pages/AlugueresPage";
import ChecklistsPage from "./pages/ChecklistsPage";
import ContratosPage from "./pages/ContratosPage";
import DashboardPage from "./pages/DashboardPage";
import EmpresasPage from "./pages/EmpresasPage";
import LoginPage from "./pages/LoginPage";
import MotoristasPage from "./pages/MotoristasPage";
import ProprietariosPage from "./pages/ProprietariosPage";
import RemoteSignaturePage from "./pages/RemoteSignaturePage";
import TemplatesPage from "./pages/TemplatesPage";
import VeiculosPage from "./pages/VeiculosPage";
import RegistosCriminaisPage from "./pages/RegistosCriminaisPage";

export default function App() {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/assinaturas/remotas/:token" element={<RemoteSignaturePage />} />
            <Route element={<ProtectedRoute />}>
                <Route element={<AppShell />}>
                    <Route index element={<DashboardPage />} />
                    <Route path="empresas" element={<EmpresasPage />} />
                    <Route path="proprietarios" element={<ProprietariosPage />} />
                    <Route path="motoristas" element={<MotoristasPage />} />
                    <Route path="registos-criminais" element={<RegistosCriminaisPage />} />
                    <Route path="veiculos" element={<VeiculosPage />} />
                    <Route path="checklists" element={<ChecklistsPage />} />
                    <Route path="alugueres" element={<AlugueresPage />} />
                    <Route path="contratos" element={<ContratosPage />} />
                    <Route path="templates" element={<TemplatesPage />} />
                </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
