import { lazy, Suspense } from "react";
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




const AlertsPage = lazy(
    () => import("./pages/AlertsPage"),
);

const AprovacaoManutencaoPublicaPage = lazy(
    () => import("./pages/AprovacaoManutencaoPublicaPage"),
);
const BackofficeClientPage = lazy(
    () => import("./pages/BackofficeClientPage"),
);
const BackofficeClientsPage = lazy(
    () => import("./pages/BackofficeClientsPage"),
);
const BackofficeCrmActivitiesPage = lazy(
    () => import("./pages/BackofficeCrmActivitiesPage"),
);
const BackofficeCrmDashboardPage = lazy(
    () => import("./pages/BackofficeCrmDashboardPage"),
);
const BackofficeCrmLeadPage = lazy(
    () => import("./pages/BackofficeCrmLeadPage"),
);
const BackofficeCrmLeadsPage = lazy(
    () => import("./pages/BackofficeCrmLeadsPage"),
);
const BackofficeCrmPipelinePage = lazy(
    () => import("./pages/BackofficeCrmPipelinePage"),
);
const BackofficeCrmTagsPage = lazy(
    () => import("./pages/BackofficeCrmTagsPage"),
);
const BackofficeBillingPage = lazy(
    () => import("./pages/BackofficeBillingPage"),
);
const BackofficeBillingOrdersPage = lazy(
    () => import("./pages/BackofficeBillingOrdersPage"),
);
const BackofficeDashboardPage = lazy(
    () => import("./pages/BackofficeDashboardPage"),
);
const BackofficeAnalyticsPage = lazy(
    () => import("./pages/BackofficeAnalyticsPage"),
);
const BackofficeSeoPage = lazy(
    () => import("./pages/BackofficeSeoPage"),
);
const BackofficeConteudoPage = lazy(
    () => import("./pages/BackofficeConteudoPage"),
);
const BackofficeConteudoEditPage = lazy(
    () => import("./pages/BackofficeConteudoEditPage"),
);
const BackofficeNifEnrichmentBatchPage = lazy(
    () => import("./pages/BackofficeNifEnrichmentBatchPage"),
);
const BackofficeNifEnrichmentBatchesPage = lazy(
    () => import("./pages/BackofficeNifEnrichmentBatchesPage"),
);
const BackofficeNotificationsPage = lazy(
    () => import("./pages/BackofficeNotificationsPage"),
);
const BackofficePlanPage = lazy(
    () => import("./pages/BackofficePlanPage"),
);
const BackofficePlansPage = lazy(
    () => import("./pages/BackofficePlansPage"),
);
const BackofficeSubscriptionPage = lazy(
    () => import("./pages/BackofficeSubscriptionPage"),
);
const BackofficeSubscriptionsPage = lazy(
    () => import("./pages/BackofficeSubscriptionsPage"),
);
const BackofficeTvdeImportCreatePage = lazy(
    () => import("./pages/BackofficeTvdeImportCreatePage"),
);
const BackofficeTvdeImportPage = lazy(
    () => import("./pages/BackofficeTvdeImportPage"),
);
const BackofficeTvdeImportsPage = lazy(
    () => import("./pages/BackofficeTvdeImportsPage"),
);
const BackofficeTvdeOperatorPage = lazy(
    () => import("./pages/BackofficeTvdeOperatorPage"),
);
const BackofficeTvdeOperatorsPage = lazy(
    () => import("./pages/BackofficeTvdeOperatorsPage"),
);
const ChecklistsPage = lazy(
    () => import("./pages/ChecklistsPage"),
);
const PortalChecklistsPage = lazy(
    () => import("./pages/PortalChecklistsPage"),
);
const ContratoTipoPage = lazy(
    () => import("./pages/ContratoTipoPage"),
);
const ContratosConfiguracaoPage = lazy(
    () => import("./pages/ContratosConfiguracaoPage"),
);
const ContratosPage = lazy(
    () => import("./pages/ContratosPage"),
);
const DashboardPage = lazy(
    () => import("./pages/DashboardPage"),
);
const DocumentosPage = lazy(
    () => import("./pages/DocumentosPage"),
);
const EmpresasPage = lazy(
    () => import("./pages/EmpresasPage"),
);
const ExpedientePage = lazy(
    () => import("./pages/ExpedientePage"),
);
const ExpedientePublicPage = lazy(
    () => import("./pages/ExpedientePublicPage"),
);
const FuncionarioInvitePage = lazy(
    () => import("./pages/FuncionarioInvitePage"),
);
const FuncionariosPage = lazy(
    () => import("./pages/FuncionariosPage"),
);
const LoginPage = lazy(
    () => import("./pages/LoginPage"),
);
const ManutencaoPage = lazy(
    () => import("./pages/ManutencaoPage"),
);
const MotoristaDashboardPage = lazy(
    () => import("./pages/MotoristaDashboardPage"),
);
const MotoristasPage = lazy(
    () => import("./pages/MotoristasPage"),
);
const MultasPage = lazy(
    () => import("./pages/MultasPage"),
);
const MyAccountPage = lazy(
    () => import("./pages/MyAccountPage"),
);
const OnboardingPage = lazy(
    () => import("./pages/OnboardingPage"),
);
const ProprietarioDashboardPage = lazy(
    () => import("./pages/ProprietarioDashboardPage"),
);
const ProprietariosPage = lazy(
    () => import("./pages/ProprietariosPage"),
);
const RecibosVerdesPage = lazy(
    () => import("./pages/RecibosVerdesPage"),
);
const RegistosCriminaisPage = lazy(
    () => import("./pages/RegistosCriminaisPage"),
);
const RemoteSignaturePage = lazy(
    () => import("./pages/RemoteSignaturePage"),
);
const SinistrosPage = lazy(
    () => import("./pages/SinistrosPage"),
);
const TemplatesPage = lazy(
    () => import("./pages/TemplatesPage"),
);
const VeiculosPage = lazy(
    () => import("./pages/VeiculosPage"),
);
const BackofficeAdAdvertisersPage = lazy(
    () => import("./pages/ads/BackofficeAdAdvertisersPage"),
);
const BackofficeAdApprovalsPage = lazy(
    () => import("./pages/ads/BackofficeAdApprovalsPage"),
);
const BackofficeAdCampaignPage = lazy(
    () => import("./pages/ads/BackofficeAdCampaignPage"),
);
const BackofficeAdCampaignsPage = lazy(
    () => import("./pages/ads/BackofficeAdCampaignsPage"),
);
const BackofficeAdInventoryPage = lazy(
    () => import("./pages/ads/BackofficeAdInventoryPage"),
);
const BackofficeAdOrdersPage = lazy(
    () => import("./pages/ads/BackofficeAdOrdersPage"),
);
const BackofficeAdsDashboardPage = lazy(
    () => import("./pages/ads/BackofficeAdsDashboardPage"),
);
const BackofficeAdsRouterPage = lazy(
    () => import("./pages/ads/BackofficeAdsRouterPage"),
);
const BackofficeAdSettingsPage = lazy(
    () => import("./pages/ads/BackofficeAdSettingsPage"),
);
const ChatPage = lazy(
    () => import("./pages/ChatPage"),
);
const ConfiguracoesPage = lazy(
    () => import("./pages/ConfiguracoesPage"),
);
const RelatoriosPage = lazy(
    () => import("./pages/RelatoriosPage"),
);
const AuditoriaPage = lazy(
    () => import("./pages/AuditoriaPage"),
);
const HelpdeskPage = lazy(
    () => import("./pages/HelpdeskPage"),
);
const BackofficeHelpCenterPage = lazy(
    () => import("./pages/BackofficeHelpCenterPage"),
);
const HelpCenterPage = lazy(
    () => import("./pages/HelpCenterPage"),
);
const HelpContentPage = lazy(
    () => import("./pages/HelpContentPage"),
);
const BackofficeModelosDocumentoPage = lazy(
    () => import("./pages/BackofficeModelosDocumentoPage"),
);
export default function App() {
    return (
        <Suspense fallback={<RouteLoading />}>
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
                            path="modelos-documento"
                            element={<BackofficeModelosDocumentoPage />}
                        />

                        <Route
                            path="notificacoes"
                            element={<BackofficeNotificationsPage />}
                        />

                        <Route
                            path="mensagens"
                            element={<ChatPage mode="backoffice" />}
                        />

                        <Route index element={<BackofficeDashboardPage />} />

                        <Route
                            path="analytics"
                            element={<BackofficeAnalyticsPage />}
                        />

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
                        <Route
                            path="faturacao"
                            element={<BackofficeBillingPage />}
                        />

                        <Route
                            path="faturacao/pedidos"
                            element={<BackofficeBillingOrdersPage />}
                        />

                        <Route
                            path="seo"
                            element={<BackofficeSeoPage />}
                        />

                        <Route
                            path="conteudo"
                            element={<BackofficeConteudoPage />}
                        />

                        <Route
                            path="conteudo/novo"
                            element={<BackofficeConteudoEditPage />}
                        />

                        <Route
                            path="conteudo/:id"
                            element={<BackofficeConteudoEditPage />}
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
                                element={
                                    <Navigate
                                        to="/contratos?tipo=aluguer"
                                        replace
                                    />
                                }
                            />

                            <Route
                                path="contratos"
                                element={<ContratosPage />}
                            />

                            <Route
                                path="documentos"
                                element={<DocumentosPage />}
                            />

                            <Route
                                path="contratos/configuracao"
                                element={<ContratosConfiguracaoPage />}
                            />

                            <Route
                                path="contratos/configuracao/novo"
                                element={<ContratoTipoPage />}
                            />

                            <Route
                                path="contratos/configuracao/:id"
                                element={<ContratoTipoPage />}
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

                        <Route path="alertas" element={<AlertsPage />} />

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
                            path="checklists"
                            element={<PortalChecklistsPage mode="motorista" />}
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

                        <Route path="alertas" element={<AlertsPage />} />

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

                        <Route
                            path="checklists"
                            element={<PortalChecklistsPage mode="proprietario" />}
                        />
                    </Route>
                </Route>
            </Route>

                <Route path="*" element={<Navigate to="/painel" replace />} />
            </Routes>
        </Suspense>
    );
}

function RouteLoading() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />

                <p className="text-sm font-medium text-slate-500">
                    A carregar...
                </p>
            </div>
        </div>
    );
}
