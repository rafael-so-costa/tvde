import { Navigate, Route, Routes } from "react-router-dom";

import ManagementRoute from "./components/ManagementRoute";
import PortalAreaRoute from "./components/PortalAreaRoute";
import ProtectedRoute from "./components/ProtectedRoute";
import TenantOnboardingGate from "./components/TenantOnboardingGate";

import AppShell from "./layouts/AppShell";
import MotoristaShell from "./layouts/MotoristaShell";
import ProprietarioShell from "./layouts/ProprietarioShell";

import AlertsPage from "./pages/AlertsPage";
import AlugueresPage from "./pages/AlugueresPage";
import AprovacaoManutencaoPublicaPage from "./pages/AprovacaoManutencaoPublicaPage";
import ChecklistsPage from "./pages/ChecklistsPage";
import ContratosPage from "./pages/ContratosPage";
import DashboardPage from "./pages/DashboardPage";
import EmpresasPage from "./pages/EmpresasPage";
import ExpedientePage from "./pages/ExpedientePage";
import ExpedientePublicPage from "./pages/ExpedientePublicPage";
import FuncionarioInvitePage from "./pages/FuncionarioInvitePage";
import FuncionariosPage from "./pages/FuncionariosPage";
import LoginPage from "./pages/LoginPage";
import ManutencaoPage from "./pages/ManutencaoPage";
import MotoristaDashboardPage from "./pages/MotoristaDashboardPage";
import MotoristasPage from "./pages/MotoristasPage";
import MultasPage from "./pages/MultasPage";
import MyAccountPage from "./pages/MyAccountPage";
import OnboardingPage from "./pages/OnboardingPage";
import ProprietarioDashboardPage from "./pages/ProprietarioDashboardPage";
import ProprietariosPage from "./pages/ProprietariosPage";
import RecibosVerdesPage from "./pages/RecibosVerdesPage";
import RegistosCriminaisPage from "./pages/RegistosCriminaisPage";
import RemoteSignaturePage from "./pages/RemoteSignaturePage";
import SinistrosPage from "./pages/SinistrosPage";
import TemplatesPage from "./pages/TemplatesPage";
import VeiculosPage from "./pages/VeiculosPage";
import SuperAdminRoute from "./components/SuperAdminRoute";
import BackofficeShell from "./layouts/BackofficeShell";
import BackofficeDashboardPage from "./pages/BackofficeDashboardPage";
import BackofficeClientsPage from "./pages/BackofficeClientsPage";
import BackofficeClientPage from "./pages/BackofficeClientPage";
import BackofficePlansPage from "./pages/BackofficePlansPage";
import BackofficePlanPage from "./pages/BackofficePlanPage";

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
                <Route element={<SuperAdminRoute />}>
                    <Route path="backoffice" element={<BackofficeShell />}>
                        <Route index element={<BackofficeDashboardPage />} />

                        <Route
                            path="clientes"
                            element={<BackofficeClientsPage />}
                        />

                        <Route
                            path="clientes/:id"
                            element={<BackofficeClientPage />}
                        />

                        <Route
                            path="planos"
                            element={<BackofficePlansPage />}
                        />

                        <Route
                            path="planos/novo"
                            element={<BackofficePlanPage />}
                        />

                        <Route
                            path="planos/:id"
                            element={<BackofficePlanPage />}
                        />
                    </Route>
                </Route>
                <Route element={<ManagementRoute />}>
                    <Route element={<TenantOnboardingGate />}>
                        <Route path="onboarding" element={<OnboardingPage />} />

                        <Route element={<AppShell />}>
                            <Route
                                index
                                element={<Navigate to="/painel" replace />}
                            />

                            <Route path="painel" element={<DashboardPage />} />

                            <Route
                                path="minha-conta"
                                element={<MyAccountPage />}
                            />

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

                            <Route
                                path="motoristas"
                                element={<MotoristasPage />}
                            />

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

                            <Route
                                path="manutencao"
                                element={<ManutencaoPage />}
                            />

                            <Route path="veiculos" element={<VeiculosPage />} />

                            <Route
                                path="checklists"
                                element={<ChecklistsPage />}
                            />

                            <Route
                                path="alugueres"
                                element={<AlugueresPage />}
                            />

                            <Route
                                path="contratos"
                                element={<ContratosPage />}
                            />

                            <Route
                                path="templates"
                                element={<TemplatesPage />}
                            />
                        </Route>
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
                        <Route index element={<ProprietarioDashboardPage />} />

                        <Route path="minha-conta" element={<MyAccountPage />} />

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

            <Route path="*" element={<Navigate to="/painel" replace />} />
        </Routes>
    );
}
