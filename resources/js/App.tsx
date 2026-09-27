import { Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
import ManagementRoute from "./components/ManagementRoute";
import PortalAreaRoute from "./components/PortalAreaRoute";

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
import ManutencaoPage from "./pages/ManutencaoPage";
import AprovacaoManutencaoPublicaPage from "./pages/AprovacaoManutencaoPublicaPage";
import AlertsPage from "./pages/AlertsPage";
import FuncionariosPage from "./pages/FuncionariosPage";
import FuncionarioInvitePage from "./pages/FuncionarioInvitePage";
import MyAccountPage from "./pages/MyAccountPage";
import MotoristaDashboardPage from "./pages/MotoristaDashboardPage";
import ProprietarioDashboardPage from "./pages/ProprietarioDashboardPage";

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

            <Route
                path="/aprovacao-manutencao/:token"
                element={<AprovacaoManutencaoPublicaPage />}
            />

            <Route
                path="/convites/funcionario/:token"
                element={<FuncionarioInvitePage />}
            />

            <Route element={<ProtectedRoute />}>
                <Route element={<ManagementRoute />}>
                    <Route element={<AppShell />}>
                        <Route index element={<DashboardPage />} />

                        <Route path="minha-conta" element={<MyAccountPage />} />

                        <Route path="alertas" element={<AlertsPage />} />

                        <Route path="empresas" element={<EmpresasPage />} />

                        <Route
                            path="funcionarios"
                            element={<FuncionariosPage />}
                        />

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

                        <Route path="manutencao" element={<ManutencaoPage />} />

                        <Route path="veiculos" element={<VeiculosPage />} />

                        <Route path="checklists" element={<ChecklistsPage />} />

                        <Route path="alugueres" element={<AlugueresPage />} />

                        <Route path="contratos" element={<ContratosPage />} />

                        <Route path="templates" element={<TemplatesPage />} />
                    </Route>
                </Route>

                <Route element={<PortalAreaRoute area="motorista" />}>
                    <Route path="portal/motorista" element={<MotoristaShell />}>
                        <Route index element={<MotoristaDashboardPage />} />
                        <Route path="minha-conta" element={<MyAccountPage />} />

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

                <Route element={<PortalAreaRoute area="proprietario" />}>
                    <Route
                        path="portal/proprietario"
                        element={<ProprietarioShell />}
                    >
                        <Route path="minha-conta" element={<MyAccountPage />} />
                        <Route index element={<ProprietarioDashboardPage/>}/>

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
