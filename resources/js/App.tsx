import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleRoute from "./components/RoleRoute";
import AppShell from "./layouts/AppShell";
import MotoristaShell from "./layouts/MotoristaShell";
import ProprietarioShell from "./layouts/ProprietarioShell";
import AlugueresPage from "./pages/AlugueresPage";
import ChecklistsPage from "./pages/ChecklistsPage";
import ContratosPage from "./pages/ContratosPage";
import DashboardPage from "./pages/DashboardPage";
import EmpresasPage from "./pages/EmpresasPage";
import ExpedientePage from "./pages/ExpedientePage";
import ExpedientePublicPage from "./pages/ExpedientePublicPage";
import LoginPage from "./pages/LoginPage";
import MotoristasPage from "./pages/MotoristasPage";
import MultasPage from "./pages/MultasPage";
import ProprietariosPage from "./pages/ProprietariosPage";
import RemoteSignaturePage from "./pages/RemoteSignaturePage";
import TemplatesPage from "./pages/TemplatesPage";
import VeiculosPage from "./pages/VeiculosPage";
import RegistosCriminaisPage from "./pages/RegistosCriminaisPage";
import RecibosVerdesPage from "./pages/RecibosVerdesPage";
import SinistrosPage from "./pages/SinistrosPage";

export default function App() {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route
                path="/assinaturas/remotas/:token"
                element={<RemoteSignaturePage />}
            />

            <Route
                path="/registo-expediente-publico"
                element={<ExpedientePublicPage />}
            />

            <Route element={<ProtectedRoute />}>
                <Route element={<AppShell />}>
                    <Route index element={<DashboardPage />} />

                    <Route path="empresas" element={<EmpresasPage />} />

                    <Route
                        path="proprietarios"
                        element={<ProprietariosPage />}
                    />

                    <Route path="motoristas" element={<MotoristasPage />} />

                    <Route
                        path="registos-criminais"
                        element={<RegistosCriminaisPage />}
                    />

                    <Route
                        path="recibos-verdes"
                        element={<RecibosVerdesPage />}
                    />

                    <Route
                        path="expediente"
                        element={<ExpedientePage mode="management" />}
                    />

                    <Route
                        path="multas"
                        element={<MultasPage mode="management" />}
                    />
                    <Route
                        path="sinistros"
                        element={<SinistrosPage mode="management" />}
                    />

                    <Route path="veiculos" element={<VeiculosPage />} />

                    <Route path="checklists" element={<ChecklistsPage />} />

                    <Route path="alugueres" element={<AlugueresPage />} />

                    <Route path="contratos" element={<ContratosPage />} />

                    <Route path="templates" element={<TemplatesPage />} />
                </Route>

                <Route
                    element={
                        <RoleRoute
                            allowedRoles={["motorista"]}
                            redirectTo="/"
                        />
                    }
                >
                    <Route path="portal/motorista" element={<MotoristaShell />}>
                        <Route
                            index
                            element={
                                <Navigate
                                    to="/portal/motorista/expediente"
                                    replace
                                />
                            }
                        />

                        <Route
                            path="expediente"
                            element={<ExpedientePage mode="motorista" />}
                        />

                        <Route
                            path="multas"
                            element={<MultasPage mode="readonly" />}
                        />
                        <Route
                            path="sinistros"
                            element={<SinistrosPage mode="readonly" />}
                        />

                        <Route
                            path="registo-criminal"
                            element={<RegistosCriminaisPage />}
                        />

                        <Route
                            path="recibos-verdes"
                            element={<RecibosVerdesPage />}
                        />
                    </Route>
                </Route>

                <Route
                    element={
                        <RoleRoute
                            allowedRoles={["proprietario"]}
                            redirectTo="/"
                        />
                    }
                >
                    <Route
                        path="portal/proprietario"
                        element={<ProprietarioShell />}
                    >
                        <Route
                            index
                            element={
                                <Navigate
                                    to="/portal/proprietario/multas"
                                    replace
                                />
                            }
                        />

                        <Route
                            path="multas"
                            element={<MultasPage mode="readonly" />}
                        />
                        <Route
                            path="sinistros"
                            element={<SinistrosPage mode="readonly" />}
                        />
                    </Route>
                </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
