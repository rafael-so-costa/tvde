import { Navigate, Route, Routes } from "react-router-dom";

import ManagementRoute from "./components/ManagementRoute";
import PortalAreaRoute from "./components/PortalAreaRoute";
import ProtectedRoute from "./components/ProtectedRoute";
import SuperAdminRoute from "./components/SuperAdminRoute";
import TenantOnboardingGate from "./components/TenantOnboardingGate";

import AppShell from "./layouts/AppShell";
import BackofficeShell from "./layouts/BackofficeShell";
import MotoristaShell from "./layouts/MotoristaShell";
import ProprietarioShell from "./layouts/ProprietarioShell";

import AlertsPage from "./pages/AlertsPage";
import AlugueresPage from "./pages/AlugueresPage";
import AprovacaoManutencaoPublicaPage from "./pages/AprovacaoManutencaoPublicaPage";
import BackofficeClientPage from "./pages/BackofficeClientPage";
import BackofficeClientsPage from "./pages/BackofficeClientsPage";
import BackofficeCrmActivitiesPage from "./pages/BackofficeCrmActivitiesPage";
import BackofficeCrmDashboardPage from "./pages/BackofficeCrmDashboardPage";
import BackofficeCrmLeadPage from "./pages/BackofficeCrmLeadPage";
import BackofficeCrmLeadsPage from "./pages/BackofficeCrmLeadsPage";
import BackofficeCrmPipelinePage from "./pages/BackofficeCrmPipelinePage";
import BackofficeCrmTagsPage from "./pages/BackofficeCrmTagsPage";
import BackofficeDashboardPage from "./pages/BackofficeDashboardPage";
import BackofficeNifEnrichmentBatchPage from "./pages/BackofficeNifEnrichmentBatchPage";
import BackofficeNifEnrichmentBatchesPage from "./pages/BackofficeNifEnrichmentBatchesPage";
import BackofficePlanPage from "./pages/BackofficePlanPage";
import BackofficePlansPage from "./pages/BackofficePlansPage";
import BackofficeSubscriptionPage from "./pages/BackofficeSubscriptionPage";
import BackofficeSubscriptionsPage from "./pages/BackofficeSubscriptionsPage";
import BackofficeTvdeImportCreatePage from "./pages/BackofficeTvdeImportCreatePage";
import BackofficeTvdeImportPage from "./pages/BackofficeTvdeImportPage";
import BackofficeTvdeImportsPage from "./pages/BackofficeTvdeImportsPage";
import BackofficeTvdeOperatorPage from "./pages/BackofficeTvdeOperatorPage";
import BackofficeTvdeOperatorsPage from "./pages/BackofficeTvdeOperatorsPage";
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

import BackofficeAdAdvertisersPage from "./pages/ads/BackofficeAdAdvertisersPage";
import BackofficeAdApprovalsPage from "./pages/ads/BackofficeAdApprovalsPage";
import BackofficeAdCampaignPage from "./pages/ads/BackofficeAdCampaignPage";
import BackofficeAdCampaignsPage from "./pages/ads/BackofficeAdCampaignsPage";
import BackofficeAdInventoryPage from "./pages/ads/BackofficeAdInventoryPage";
import BackofficeAdOrdersPage from "./pages/ads/BackofficeAdOrdersPage";
import BackofficeAdsDashboardPage from "./pages/ads/BackofficeAdsDashboardPage";
import BackofficeAdsRouterPage from "./pages/ads/BackofficeAdsRouterPage";
import BackofficeAdSettingsPage from "./pages/ads/BackofficeAdSettingsPage";
import ChatPage from "./pages/ChatPage";
import ConfiguracoesPage from "./pages/ConfiguracoesPage";
import RelatoriosPage from "./pages/RelatoriosPage";
import AuditoriaPage from "./pages/AuditoriaPage";
import HelpdeskPage from "./pages/HelpdeskPage";
import BackofficeHelpCenterPage from "./pages/BackofficeHelpCenterPage";
import HelpCenterPage from "./pages/HelpCenterPage";
import HelpContentPage from "./pages/HelpContentPage";

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
                        <Route
                            path="helpdesk"
                            element={<HelpdeskPage mode="backoffice" />}
                        />
                        <Route
                            path="ajuda"
                            element={<BackofficeHelpCenterPage />}
                        />
                        <Route
                            path="mensagens"
                            element={<ChatPage mode="backoffice" />}
                        />
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

                        <Route
                            path="assinaturas"
                            element={<BackofficeSubscriptionsPage />}
                        />

                        <Route
                            path="assinaturas/:id"
                            element={<BackofficeSubscriptionPage />}
                        />

                        <Route path="ads" element={<BackofficeAdsRouterPage />}>
                            <Route
                                index
                                element={<BackofficeAdsDashboardPage />}
                            />

                            <Route
                                path="campanhas"
                                element={<BackofficeAdCampaignsPage />}
                            />

                            <Route
                                path="campanhas/nova"
                                element={<BackofficeAdCampaignPage />}
                            />

                            <Route
                                path="campanhas/:id"
                                element={<BackofficeAdCampaignPage />}
                            />

                            <Route
                                path="aprovacoes"
                                element={<BackofficeAdApprovalsPage />}
                            />

                            <Route
                                path="anunciantes"
                                element={<BackofficeAdAdvertisersPage />}
                            />

                            <Route
                                path="inventario"
                                element={<BackofficeAdInventoryPage />}
                            />

                            <Route
                                path="pedidos"
                                element={<BackofficeAdOrdersPage />}
                            />

                            <Route
                                path="configuracoes"
                                element={<BackofficeAdSettingsPage />}
                            />
                        </Route>

                        <Route
                            path="crm"
                            element={<BackofficeCrmDashboardPage />}
                        />

                        <Route
                            path="crm/leads"
                            element={<BackofficeCrmLeadsPage />}
                        />

                        <Route
                            path="crm/leads/:id"
                            element={<BackofficeCrmLeadPage />}
                        />

                        <Route
                            path="crm/pipeline"
                            element={<BackofficeCrmPipelinePage />}
                        />

                        <Route
                            path="crm/atividades"
                            element={<BackofficeCrmActivitiesPage />}
                        />

                        <Route
                            path="crm/tags"
                            element={<BackofficeCrmTagsPage />}
                        />

                        <Route
                            path="crm/operadores"
                            element={<BackofficeTvdeOperatorsPage />}
                        />

                        <Route
                            path="crm/operadores/:id"
                            element={<BackofficeTvdeOperatorPage />}
                        />

                        <Route
                            path="crm/enriquecimento/lotes"
                            element={<BackofficeNifEnrichmentBatchesPage />}
                        />

                        <Route
                            path="crm/enriquecimento/lotes/:id"
                            element={<BackofficeNifEnrichmentBatchPage />}
                        />

                        <Route
                            path="crm/importacoes/nova"
                            element={<BackofficeTvdeImportCreatePage />}
                        />

                        <Route
                            path="crm/importacoes"
                            element={<BackofficeTvdeImportsPage />}
                        />

                        <Route
                            path="crm/importacoes/:id"
                            element={<BackofficeTvdeImportPage />}
                        />
                    </Route>
                </Route>

                <Route element={<ManagementRoute />}>
                    <Route element={<TenantOnboardingGate />}>
                        <Route path="onboarding" element={<OnboardingPage />} />

                        <Route element={<AppShell />}>
                            <Route
                                path="helpdesk"
                                element={<HelpdeskPage mode="tenant" />}
                            />
                            <Route
                                path="ajuda"
                                element={<HelpCenterPage basePath="/ajuda" />}
                            />

                            <Route
                                path="ajuda/:slug"
                                element={<HelpContentPage basePath="/ajuda" />}
                            />
                            <Route path="mensagens" element={<ChatPage />} />
                            <Route
                                index
                                element={<Navigate to="/painel" replace />}
                            />
                            <Route
                                path="relatorios"
                                element={<RelatoriosPage />}
                            />
                            <Route
                                path="auditoria"
                                element={<AuditoriaPage />}
                            />

                            <Route path="painel" element={<DashboardPage />} />

                            <Route
                                path="minha-conta"
                                element={<MyAccountPage />}
                            />
                            <Route
                                path="configuracoes"
                                element={<ConfiguracoesPage />}
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
                            path="ajuda"
                            element={
                                <HelpCenterPage basePath="/portal/motorista/ajuda" />
                            }
                        />

                        <Route
                            path="ajuda/:slug"
                            element={
                                <HelpContentPage basePath="/portal/motorista/ajuda" />
                            }
                        />

                        <Route
                            path="expediente"
                            element={<ExpedientePage mode="motorista" />}
                        />
                        <Route path="mensagens" element={<ChatPage />} />

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
                        <Route
                            path="ajuda"
                            element={
                                <HelpCenterPage basePath="/portal/proprietario/ajuda" />
                            }
                        />

                        <Route
                            path="ajuda/:slug"
                            element={
                                <HelpContentPage basePath="/portal/proprietario/ajuda" />
                            }
                        />

                        <Route path="minha-conta" element={<MyAccountPage />} />

                        <Route
                            path="multas"
                            element={<MultasPage mode="readonly" />}
                        />
                        <Route path="mensagens" element={<ChatPage />} />

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
