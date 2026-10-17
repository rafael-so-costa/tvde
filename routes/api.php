<?php

use App\Http\Controllers\AlertController;
use App\Http\Controllers\AluguerController;
use App\Http\Controllers\AuditoriaController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BackofficeBillingController;
use App\Http\Controllers\BackofficeBillingPaymentController;
use App\Http\Controllers\BackofficeChatController;
use App\Http\Controllers\BackofficeClientController;
use App\Http\Controllers\BackofficeCrmActivityController;
use App\Http\Controllers\BackofficeCrmConversionController;
use App\Http\Controllers\BackofficeCrmDashboardController;
use App\Http\Controllers\BackofficeCrmLeadController;
use App\Http\Controllers\BackofficeCrmLeadStageController;
use App\Http\Controllers\BackofficeCrmPipelineController;
use App\Http\Controllers\BackofficeCrmProspectController;
use App\Http\Controllers\BackofficeCrmTagController;
use App\Http\Controllers\BackofficeDashboardController;
use App\Http\Controllers\Backoffice\BackofficeConteudoController;
use App\Http\Controllers\Backoffice\BackofficeConteudoBuscaController;
use App\Http\Controllers\Backoffice\BackofficeConteudoDashboardController;
use App\Http\Controllers\Backoffice\BackofficeSeoController;
use App\Http\Controllers\BackofficeHelpCategoryController;
use App\Http\Controllers\BackofficeHelpCenterController;
use App\Http\Controllers\BackofficeHelpdeskController;
use App\Http\Controllers\BackofficeNifEnrichmentBatchController;
use App\Http\Controllers\BackofficePlanController;
use App\Http\Controllers\BackofficePlatformNotificationController;
use App\Http\Controllers\BackofficeSubscriptionController;
use App\Http\Controllers\BackofficeTvdeImportController;
use App\Http\Controllers\BackofficeTvdeOperatorController;
use App\Http\Controllers\BackofficeTvdeOperatorEnrichmentController;
use App\Http\Controllers\ChatAttachmentController;
use App\Http\Controllers\ChatController;
use App\Http\Controllers\ChecklistProcessRunController;
use App\Http\Controllers\ChecklistProcessTemplateController;
use App\Http\Controllers\ChecklistRecordController;
use App\Http\Controllers\CompraController;
use App\Http\Controllers\ContratoController;
use App\Http\Controllers\CurrentPermissionController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DeclaracaoController;
use App\Http\Controllers\EmpresaController;
use App\Http\Controllers\EstoqueController;
use App\Http\Controllers\ExpedienteController;
use App\Http\Controllers\ExpedientePublicController;
use App\Http\Controllers\FornecedorController;
use App\Http\Controllers\FuncionarioController;
use App\Http\Controllers\FuncionarioInvitationController;
use App\Http\Controllers\HelpCenterController;
use App\Http\Controllers\HelpdeskAttachmentController;
use App\Http\Controllers\HelpdeskController;
use App\Http\Controllers\IfthenpayCallbackController;
use App\Http\Controllers\ManutencaoController;
use App\Http\Controllers\ManutencaoPlanoController;
use App\Http\Controllers\MotoristaAccountController;
use App\Http\Controllers\MotoristaController;
use App\Http\Controllers\MotoristaDashboardController;
use App\Http\Controllers\MotoristaFotoController;
use App\Http\Controllers\MultaController;
use App\Http\Controllers\MyAccountController;
use App\Http\Controllers\NotificationPreferenceController;
use App\Http\Controllers\PecaController;
use App\Http\Controllers\PerfilTemplateController;
use App\Http\Controllers\PortalIdentityController;
use App\Http\Controllers\ProprietarioAccountController;
use App\Http\Controllers\ProprietarioController;
use App\Http\Controllers\ProprietarioDashboardController;
use App\Http\Controllers\ReciboVerdeController;
use App\Http\Controllers\RegistoCriminalController;
use App\Http\Controllers\RelatorioController;
use App\Http\Controllers\RemoteSignatureController;
use App\Http\Controllers\SaasOnboardingController;
use App\Http\Controllers\SinistroController;
use App\Http\Controllers\TemplateContratoController;
use App\Http\Controllers\TemplateImportController;
use App\Http\Controllers\TenantContextController;
use App\Http\Controllers\TenantCustomFieldController;
use App\Http\Controllers\TenantSettingsController;
use App\Http\Controllers\VeiculoController;
use App\Http\Controllers\VeiculoDiagnosticoController;
use App\Services\TenantContext;
use Illuminate\Support\Facades\Route;

Route::get('/assinaturas/remotas/{token}', [RemoteSignatureController::class, 'show'])
    ->whereUuid('token')
    ->middleware('throttle:30,1');
Route::post('/assinaturas/remotas/{token}/confirmar', [RemoteSignatureController::class, 'confirm'])
    ->whereUuid('token')
    ->middleware('throttle:5,1');
Route::post('/expediente/publico/marcar', [ExpedientePublicController::class, 'marcar'])->middleware('throttle:10,1');
Route::get('/manutencoes/aprovacoes/{token}', [ManutencaoController::class, 'showAprovacaoPublica'])->middleware('throttle:30,1');
Route::post('/manutencoes/aprovacoes/{token}/responder', [ManutencaoController::class, 'responderAprovacaoPublica'])->middleware('throttle:10,1');
Route::get('/funcionario-convites/{token}', [FuncionarioInvitationController::class, 'show'])
    ->where('token', '[A-Za-z0-9]{64}')
    ->middleware('throttle:30,1');
Route::post('/funcionario-convites/{token}/aceitar', [FuncionarioInvitationController::class, 'accept'])
    ->where('token', '[A-Za-z0-9]{64}')
    ->middleware('throttle:5,1');

Route::get(
    '/payments/ifthenpay/callback',
    IfthenpayCallbackController::class
)
    ->middleware('throttle:60,1')
    ->name('ifthenpay.callback');
Route::middleware('auth:sanctum')->group(function () {

    Route::get('/chat/anexos/{id}/arquivo', [ChatAttachmentController::class, 'show'])->whereUuid('id');
    Route::get('/chat/anexos/{id}/download', [ChatAttachmentController::class, 'download'])->whereUuid('id');
    Route::get(
        '/helpdesk/anexos/{id}/arquivo',
        [HelpdeskAttachmentController::class, 'show']
    )->whereUuid('id');

    Route::get(
        '/helpdesk/anexos/{id}/download',
        [HelpdeskAttachmentController::class, 'download']
    )->whereUuid('id');
    Route::middleware('super_admin')
        ->prefix('backoffice')
        ->group(function () {

            Route::get(
                '/seo',
                [BackofficeSeoController::class, 'index']
            );

            Route::patch(
                '/seo/{chave}',
                [BackofficeSeoController::class, 'update']
            )->where(
                'chave',
                '[A-Za-z0-9_-]+'
            );


            Route::post(
                '/seo/assets',
                [BackofficeSeoController::class, 'uploadAsset']
            );
                        Route::get(
                '/conteudo/dashboard',
                BackofficeConteudoDashboardController::class
            );
Route::get(
                '/conteudo/resumo',
                [BackofficeConteudoController::class, 'summary']
            );
            Route::post(
                '/conteudo/imagem',
                [BackofficeConteudoController::class, 'uploadImage']
            );
            Route::get(
                '/conteudo/buscas',
                [BackofficeConteudoBuscaController::class, 'index']
            );

            Route::post(
                '/conteudo/buscas/{id}/pauta',
                [BackofficeConteudoBuscaController::class, 'createDraft']
            )->whereUuid('id');
Route::get(
                '/conteudo/categorias',
                [BackofficeConteudoController::class, 'categories']
            );

            Route::post(
                '/conteudo/categorias',
                [BackofficeConteudoController::class, 'storeCategory']
            );

            Route::get(
                '/conteudo',
                [BackofficeConteudoController::class, 'index']
            );

            Route::post(
                '/conteudo',
                [BackofficeConteudoController::class, 'store']
            );

            Route::get(
                '/conteudo/{id}',
                [BackofficeConteudoController::class, 'show']
            )->whereUuid('id');

            Route::patch(
                '/conteudo/{id}',
                [BackofficeConteudoController::class, 'update']
            )->whereUuid('id');

            Route::post(
                '/conteudo/{id}/publicar',
                [BackofficeConteudoController::class, 'publish']
            )->whereUuid('id');

            Route::post(
                '/conteudo/{id}/arquivar',
                [BackofficeConteudoController::class, 'archive']
            )->whereUuid('id');

            Route::prefix(
                'notificacoes'
            )->group(function () {
                Route::get(
                    '/resumo',
                    [
                        BackofficePlatformNotificationController::class,
                        'summary',
                    ]
                );

                Route::get(
                    '/meta',
                    [
                        BackofficePlatformNotificationController::class,
                        'meta',
                    ]
                );

                Route::get(
                    '/',
                    [
                        BackofficePlatformNotificationController::class,
                        'index',
                    ]
                );

                Route::post(
                    '/',
                    [
                        BackofficePlatformNotificationController::class,
                        'store',
                    ]
                );

                Route::get(
                    '/{id}',
                    [
                        BackofficePlatformNotificationController::class,
                        'show',
                    ]
                )->whereUuid('id');

                Route::patch(
                    '/{id}',
                    [
                        BackofficePlatformNotificationController::class,
                        'update',
                    ]
                )->whereUuid('id');

                Route::post(
                    '/{id}/resolver',
                    [
                        BackofficePlatformNotificationController::class,
                        'resolve',
                    ]
                )->whereUuid('id');

                Route::delete(
                    '/{id}',
                    [
                        BackofficePlatformNotificationController::class,
                        'destroy',
                    ]
                )->whereUuid('id');
            });

            Route::prefix('ajuda')->group(function () {
                Route::get('/resumo', [BackofficeHelpCenterController::class, 'summary']);
                Route::get('/meta', [BackofficeHelpCenterController::class, 'meta']);

                Route::get('/categorias', [BackofficeHelpCategoryController::class, 'index']);
                Route::post('/categorias', [BackofficeHelpCategoryController::class, 'store']);
                Route::patch('/categorias/{id}', [BackofficeHelpCategoryController::class, 'update'])->whereUuid('id');
                Route::delete('/categorias/{id}', [BackofficeHelpCategoryController::class, 'destroy'])->whereUuid('id');

                Route::get('/conteudos', [BackofficeHelpCenterController::class, 'index']);
                Route::post('/conteudos', [BackofficeHelpCenterController::class, 'store']);
                Route::get('/conteudos/{id}', [BackofficeHelpCenterController::class, 'show'])->whereUuid('id');
                Route::patch('/conteudos/{id}', [BackofficeHelpCenterController::class, 'update'])->whereUuid('id');
                Route::delete('/conteudos/{id}', [BackofficeHelpCenterController::class, 'destroy'])->whereUuid('id');
            });

            Route::get(
                '/helpdesk/resumo',
                [BackofficeHelpdeskController::class, 'summary']
            );

            Route::get(
                '/helpdesk/meta',
                [BackofficeHelpdeskController::class, 'meta']
            );

            Route::get(
                '/helpdesk',
                [BackofficeHelpdeskController::class, 'index']
            );

            Route::get(
                '/helpdesk/{id}',
                [BackofficeHelpdeskController::class, 'show']
            )->whereUuid('id');

            Route::post(
                '/helpdesk/{id}/mensagens',
                [BackofficeHelpdeskController::class, 'message']
            )->whereUuid('id');

            Route::patch(
                '/helpdesk/{id}',
                [BackofficeHelpdeskController::class, 'update']
            )->whereUuid('id');

            Route::get('/chat', [BackofficeChatController::class, 'index']);
            Route::get('/chat/resumo', [BackofficeChatController::class, 'summary']);
            Route::get('/chat/destinatarios', [BackofficeChatController::class, 'recipients']);
            Route::post('/chat', [BackofficeChatController::class, 'store']);
            Route::get('/chat/{id}', [BackofficeChatController::class, 'show'])->whereUuid('id');
            Route::post('/chat/{id}/mensagens', [BackofficeChatController::class, 'message'])->whereUuid('id');

            /*
             * CRM - Dashboard
             */
            Route::get(
                '/crm/dashboard',
                [BackofficeCrmDashboardController::class, 'show']
            );

            /*
             * CRM - Pipeline
             */
            Route::get(
                '/crm/pipeline',
                [BackofficeCrmPipelineController::class, 'index']
            );

            /*
             * CRM - Responsáveis
             */
            Route::get(
                '/crm/assignees',
                [BackofficeCrmLeadController::class, 'assignees']
            );

            /*
             * CRM - Leads
             */
            Route::get(
                '/crm/leads',
                [BackofficeCrmLeadController::class, 'index']
            );

            Route::post(
                '/crm/leads',
                [BackofficeCrmLeadController::class, 'store']
            );

            Route::get(
                '/crm/leads/{id}',
                [BackofficeCrmLeadController::class, 'show']
            )
                ->whereUuid(
                    'id'
                );

            Route::patch(
                '/crm/leads/{id}',
                [BackofficeCrmLeadController::class, 'update']
            )
                ->whereUuid(
                    'id'
                );

            Route::patch(
                '/crm/leads/{id}/etapa',
                [BackofficeCrmLeadStageController::class, 'update']
            )
                ->whereUuid(
                    'id'
                );

            Route::post(
                '/crm/leads/{id}/converter',
                [BackofficeCrmConversionController::class, 'store']
            )
                ->whereUuid(
                    'id'
                );

            /*
             * CRM - Criação de leads através da Base TVDE
             */
            Route::post(
                '/crm/prospects/operadores',
                [BackofficeCrmProspectController::class, 'store']
            );

            /*
             * CRM - Atividades
             */
            Route::get(
                '/crm/atividades',
                [BackofficeCrmActivityController::class, 'index']
            );

            Route::post(
                '/crm/leads/{leadId}/atividades',
                [BackofficeCrmActivityController::class, 'store']
            )
                ->whereUuid(
                    'leadId'
                );

            Route::post(
                '/crm/atividades/{id}/concluir',
                [BackofficeCrmActivityController::class, 'complete']
            )
                ->whereUuid(
                    'id'
                );

            Route::post(
                '/crm/atividades/{id}/cancelar',
                [BackofficeCrmActivityController::class, 'cancel']
            )
                ->whereUuid(
                    'id'
                );

            /*
             * CRM - Tags
             */
            Route::get(
                '/crm/tags',
                [BackofficeCrmTagController::class, 'index']
            );

            Route::post(
                '/crm/tags',
                [BackofficeCrmTagController::class, 'store']
            );

            Route::patch(
                '/crm/tags/{id}',
                [BackofficeCrmTagController::class, 'update']
            )
                ->whereUuid(
                    'id'
                );

            Route::delete(
                '/crm/tags/{id}',
                [BackofficeCrmTagController::class, 'destroy']
            )
                ->whereUuid(
                    'id'
                );

            /*
             * CRM - Base oficial TVDE
             */
            Route::get(
                '/crm/operadores',
                [BackofficeTvdeOperatorController::class, 'index']
            );

            Route::get(
                '/crm/operadores/{id}',
                [BackofficeTvdeOperatorController::class, 'show']
            )
                ->whereUuid(
                    'id'
                );

            /*
             * CRM - Enriquecimento individual NIF.PT
             */
            Route::get(
                '/crm/operadores/{id}/enriquecimento',
                [BackofficeTvdeOperatorEnrichmentController::class, 'show']
            )
                ->whereUuid(
                    'id'
                );

            Route::post('/crm/operadores/{id}/enriquecimento', [BackofficeTvdeOperatorEnrichmentController::class, 'store'])
                ->whereUuid('id');

            /*
             * CRM - Lotes NIF.PT
             */
            Route::get(
                '/crm/enriquecimento/lotes',
                [BackofficeNifEnrichmentBatchController::class, 'index']
            );

            Route::post(
                '/crm/enriquecimento/lotes',
                [BackofficeNifEnrichmentBatchController::class, 'store']
            );

            Route::get(
                '/crm/enriquecimento/lotes/{id}',
                [BackofficeNifEnrichmentBatchController::class, 'show']
            )
                ->whereUuid(
                    'id'
                );

            Route::post(
                '/crm/enriquecimento/lotes/{id}/processar',
                [BackofficeNifEnrichmentBatchController::class, 'process']
            )
                ->whereUuid(
                    'id'
                )
                ->middleware(
                    'throttle:1,1'
                );

            Route::post(
                '/crm/enriquecimento/lotes/{id}/cancelar',
                [BackofficeNifEnrichmentBatchController::class, 'cancel']
            )
                ->whereUuid(
                    'id'
                );

            /*
             * CRM - Importações oficiais TVDE
             */
            Route::get(
                '/crm/importacoes',
                [BackofficeTvdeImportController::class, 'index']
            );

            Route::post(
                '/crm/importacoes',
                [BackofficeTvdeImportController::class, 'store']
            )
                ->middleware(
                    'throttle:2,1'
                );

            Route::get(
                '/crm/importacoes/{id}',
                [BackofficeTvdeImportController::class, 'show']
            )
                ->whereUuid(
                    'id'
                );

            Route::get(
                '/faturacao/pedidos',
                [BackofficeBillingController::class, 'orders']
            );
            Route::get(
                '/faturacao/resumo',
                [BackofficeBillingController::class, 'show']
            );
            Route::post(
                '/faturacao/assinaturas/{id}/multibanco',
                [BackofficeBillingPaymentController::class, 'subscription']
            )
                ->whereUuid('id');

            Route::post(
                '/faturacao/ads/{id}/multibanco',
                [BackofficeBillingPaymentController::class, 'adOrder']
            )
                ->whereUuid('id');

            Route::post(
                '/faturacao/pagamentos/{id}/simular',
                [BackofficeBillingPaymentController::class, 'simulate']
            )
                ->whereUuid('id');
            Route::get(
                '/assinaturas',
                [BackofficeSubscriptionController::class, 'index']
            );

            Route::get(
                '/assinaturas/{id}',
                [BackofficeSubscriptionController::class, 'show']
            )
                ->whereUuid(
                    'id'
                );

            Route::patch(
                '/assinaturas/{id}',
                [BackofficeSubscriptionController::class, 'update']
            )
                ->whereUuid(
                    'id'
                );

            Route::post(
                '/assinaturas/{id}/acao',
                [BackofficeSubscriptionController::class, 'action']
            )
                ->whereUuid(
                    'id'
                );

            Route::get(
                '/clientes/{id}/plano-preview',
                [BackofficeClientController::class, 'planPreview']
            )
                ->whereUuid(
                    'id'
                );

            Route::patch(
                '/clientes/{id}/plano',
                [BackofficeClientController::class, 'plan']
            )
                ->whereUuid(
                    'id'
                );

            Route::get(
                '/planos',
                [BackofficePlanController::class, 'index']
            );

            Route::post(
                '/planos',
                [BackofficePlanController::class, 'store']
            );

            Route::get(
                '/planos/{id}',
                [BackofficePlanController::class, 'show']
            )
                ->whereUuid(
                    'id'
                );

            Route::patch(
                '/planos/{id}',
                [BackofficePlanController::class, 'update']
            )
                ->whereUuid(
                    'id'
                );

            Route::patch(
                '/clientes/{id}/multiempresa',
                [BackofficeClientController::class, 'multiCompany']
            )
                ->whereUuid('id');

            Route::get(
                '/dashboard',
                [BackofficeDashboardController::class, 'show']
            );

            Route::get(
                '/clientes',
                [BackofficeClientController::class, 'index']
            );

            Route::get(
                '/clientes/{id}',
                [BackofficeClientController::class, 'show']
            )
                ->whereUuid(
                    'id'
                );

            Route::patch(
                '/clientes/{id}/estado',
                [BackofficeClientController::class, 'status']
            )
                ->whereUuid(
                    'id'
                );
        });

    Route::get('/minha-conta', [MyAccountController::class, 'show']);
    Route::patch('/minha-conta', [MyAccountController::class, 'update']);
    Route::patch('/minha-conta/senha', [MyAccountController::class, 'password']);
    Route::get('/minha-conta/sessoes', [MyAccountController::class, 'sessions']);
    Route::delete('/minha-conta/sessoes/outras', [MyAccountController::class, 'terminateOtherSessions']);
    Route::get('/user', [AuthController::class, 'me']);
    Route::get('/tenant-options', [TenantContextController::class, 'options']);
    Route::post('/tenant-context', [TenantContextController::class, 'select']);
    Route::delete('/tenant-context', [TenantContextController::class, 'clear']);

    Route::middleware('tenant')->group(function () {

        Route::get(
            '/onboarding/progresso',
            [
                SaasOnboardingController::class,
                'progress',
            ]
        );

        Route::get('/ajuda/meta', [HelpCenterController::class, 'meta']);
        Route::get('/ajuda', [HelpCenterController::class, 'index']);
        Route::get('/ajuda/conteudos/{slug}', [HelpCenterController::class, 'show']);
        Route::post('/ajuda/conteudos/{id}/visualizacao', [HelpCenterController::class, 'view'])->whereUuid('id');

        Route::get(
            '/helpdesk/resumo',
            [HelpdeskController::class, 'summary']
        );

        Route::get(
            '/helpdesk/meta',
            [HelpdeskController::class, 'meta']
        );

        Route::get(
            '/helpdesk',
            [HelpdeskController::class, 'index']
        );

        Route::post(
            '/helpdesk',
            [HelpdeskController::class, 'store']
        );

        Route::get(
            '/helpdesk/{id}',
            [HelpdeskController::class, 'show']
        )->whereUuid('id');

        Route::post(
            '/helpdesk/{id}/mensagens',
            [HelpdeskController::class, 'message']
        )->whereUuid('id');

        Route::post(
            '/helpdesk/{id}/fechar',
            [HelpdeskController::class, 'close']
        )->whereUuid('id');

        Route::post(
            '/helpdesk/{id}/reabrir',
            [HelpdeskController::class, 'reopen']
        )->whereUuid('id');

        Route::post(
            '/helpdesk/{id}/avaliacao',
            [HelpdeskController::class, 'rate']
        )->whereUuid('id');
        Route::middleware('permission:auditoria,visualizar')
            ->prefix('auditoria')
            ->group(function () {
                Route::get(
                    '/',
                    [AuditoriaController::class, 'index']
                );

                Route::get(
                    '/{id}',
                    [AuditoriaController::class, 'show']
                )->whereUuid('id');
            });
        Route::middleware('permission:relatorios,visualizar')->prefix('relatorios')->group(function () {
            Route::get('/resumo', [RelatorioController::class, 'resumo']);
            Route::get('/documentos', [RelatorioController::class, 'documentos']);
            Route::get('/veiculos', [RelatorioController::class, 'veiculos']);
            Route::get('/motoristas', [RelatorioController::class, 'motoristas']);
            Route::get('/ocorrencias', [RelatorioController::class, 'ocorrencias']);
            Route::get('/alugueres', [RelatorioController::class, 'alugueres']);
        });
        Route::middleware('permission:configuracoes,visualizar')->group(function () {
            Route::get('/configuracoes', [TenantSettingsController::class, 'show']);
            Route::get('/configuracoes/campos', [TenantCustomFieldController::class, 'index']);
        });

        Route::middleware('permission:configuracoes,configurar')->group(function () {
            Route::patch('/configuracoes', [TenantSettingsController::class, 'update']);
            Route::post('/configuracoes/campos', [TenantCustomFieldController::class, 'store']);
            Route::patch('/configuracoes/campos/{id}', [TenantCustomFieldController::class, 'update'])->whereUuid('id');
            Route::delete('/configuracoes/campos/{id}', [TenantCustomFieldController::class, 'destroy'])->whereUuid('id');
        });
        Route::get('/chat', [ChatController::class, 'index']);
        Route::get('/chat/resumo', [ChatController::class, 'summary']);
        Route::get('/chat/destinatarios', [ChatController::class, 'recipients']);
        Route::post('/chat', [ChatController::class, 'store']);
        Route::get('/chat/{id}', [ChatController::class, 'show'])->whereUuid('id');
        Route::post('/chat/{id}/mensagens', [ChatController::class, 'message'])->whereUuid('id');
        Route::post('/chat/{id}/lido', [ChatController::class, 'read'])->whereUuid('id');
        Route::get(
            '/onboarding',
            [SaasOnboardingController::class, 'show']
        );

        Route::patch(
            '/onboarding',
            [SaasOnboardingController::class, 'update']
        )->middleware('permission:empresas,configurar');

        Route::get('/portal/proprietario/dashboard', [ProprietarioDashboardController::class, 'show']);
        Route::get('/portal/motorista/dashboard', [MotoristaDashboardController::class, 'show']);
        Route::get('/portal/identity', [PortalIdentityController::class, 'show']);
        Route::get('/permissoes-atuais', [CurrentPermissionController::class, 'index']);

        Route::middleware('permission:funcionarios,visualizar')->group(function () {
            Route::get('/funcionarios', [FuncionarioController::class, 'index']);
            Route::get('/funcionarios/{id}', [FuncionarioController::class, 'show'])->whereUuid('id');
        });

        Route::middleware('permission:funcionarios,configurar')->group(function () {
            Route::post('/funcionarios', [FuncionarioController::class, 'store']);
            Route::patch('/funcionarios/{id}', [FuncionarioController::class, 'update'])->whereUuid('id');
            Route::patch('/funcionarios/{id}/estado', [FuncionarioController::class, 'status'])->whereUuid('id');
            Route::post('/funcionarios/{id}/acesso', [FuncionarioController::class, 'provisionAccess'])->whereUuid('id');
            Route::post('/funcionarios/{id}/acesso/reenviar', [FuncionarioController::class, 'resendInvite'])->whereUuid('id');
            Route::patch('/funcionarios/{id}/acesso', [FuncionarioController::class, 'accessStatus'])->whereUuid('id');
            Route::get('/funcionarios/{id}/permissoes', [FuncionarioController::class, 'permissions'])->whereUuid('id');
            Route::put('/funcionarios/{id}/permissoes', [FuncionarioController::class, 'updatePermissions'])->whereUuid('id');
        });

        Route::get('/alertas/preferencias', [NotificationPreferenceController::class, 'index']);
        Route::put('/alertas/preferencias/email', [NotificationPreferenceController::class, 'upsertEmail']);
        Route::delete('/alertas/preferencias/email', [NotificationPreferenceController::class, 'destroyEmail']);
        Route::get('/alertas/entregas', [NotificationPreferenceController::class, 'deliveries']);
        Route::get('/alertas/resumo', [AlertController::class, 'summary']);
        Route::post('/alertas/marcar-todos-lidos', [AlertController::class, 'markAllRead']);
        Route::get('/alertas', [AlertController::class, 'index']);
        Route::get('/alertas/{id}', [AlertController::class, 'show'])->whereUuid('id');
        Route::post('/alertas/{id}/lido', [AlertController::class, 'markRead'])->whereUuid('id');
        Route::post('/alertas/{id}/reconhecer', [AlertController::class, 'acknowledge'])->whereUuid('id');
        Route::post('/alertas/{id}/adiar', [AlertController::class, 'snooze'])->whereUuid('id');
        Route::post('/alertas/{id}/resolver', [AlertController::class, 'resolve'])
            ->whereUuid('id')
            ->middleware('permission:alertas,configurar');

        Route::middleware('permission:manutencao,visualizar')->group(function () {
            Route::get('/manutencao-planos', [ManutencaoPlanoController::class, 'index']);
            Route::get('/manutencao-planos/{id}', [ManutencaoPlanoController::class, 'show']);
        });

        Route::middleware('permission:manutencao,configurar')->group(function () {
            Route::post('/manutencao-planos', [ManutencaoPlanoController::class, 'store']);
            Route::patch('/manutencao-planos/{id}', [ManutencaoPlanoController::class, 'update']);
            Route::post('/manutencao-planos/{id}/veiculos', [ManutencaoPlanoController::class, 'associarVeiculo']);
            Route::delete('/manutencao-planos/{id}', [ManutencaoPlanoController::class, 'destroy']);
        });

        Route::middleware('permission:manutencao,visualizar')->group(function () {
            Route::get('/fornecedores', [FornecedorController::class, 'index']);
            Route::get('/fornecedores/{id}', [FornecedorController::class, 'show']);
        });

        Route::middleware('permission:manutencao,configurar')->group(function () {
            Route::post('/fornecedores', [FornecedorController::class, 'store']);
            Route::patch('/fornecedores/{id}', [FornecedorController::class, 'update']);
            Route::delete('/fornecedores/{id}', [FornecedorController::class, 'destroy']);
        });

        Route::middleware('permission:manutencao,visualizar')->group(function () {
            Route::get('/pecas', [PecaController::class, 'index']);
            Route::get('/pecas/{id}', [PecaController::class, 'show']);
        });

        Route::middleware('permission:manutencao,configurar')->group(function () {
            Route::post('/pecas', [PecaController::class, 'store']);
            Route::patch('/pecas/{id}', [PecaController::class, 'update']);
            Route::delete('/pecas/{id}', [PecaController::class, 'destroy']);
        });

        Route::middleware('permission:manutencao,visualizar')->group(function () {
            Route::get('/compras', [CompraController::class, 'index']);
            Route::get('/compras/{id}', [CompraController::class, 'show']);
        });

        Route::middleware('permission:manutencao,configurar')->group(function () {
            Route::post('/compras', [CompraController::class, 'store']);
            Route::patch('/compras/{id}', [CompraController::class, 'update']);
            Route::post('/compras/{id}/encomendar', [CompraController::class, 'encomendar']);
            Route::post('/compras/{id}/receber', [CompraController::class, 'receber']);
            Route::post('/compras/{id}/cancelar', [CompraController::class, 'cancelar']);
            Route::delete('/compras/{id}', [CompraController::class, 'destroy']);
        });

        Route::middleware('permission:manutencao,visualizar')->group(function () {
            Route::get('/estoque', [EstoqueController::class, 'index']);
            Route::get('/estoque/movimentos', [EstoqueController::class, 'movimentos']);
        });

        Route::middleware('permission:manutencao,configurar')->group(function () {
            Route::post('/estoque/{pecaId}/ajustar', [EstoqueController::class, 'ajustar']);
        });

        Route::middleware('permission:manutencao,visualizar')->group(function () {
            Route::get('/diagnosticos', [VeiculoDiagnosticoController::class, 'index']);
            Route::get('/diagnosticos/{id}', [VeiculoDiagnosticoController::class, 'show']);
        });

        Route::middleware('permission:manutencao,configurar')->group(function () {
            Route::post('/diagnosticos', [VeiculoDiagnosticoController::class, 'store']);
            Route::post('/diagnosticos/{id}/resolver', [VeiculoDiagnosticoController::class, 'resolver']);
            Route::post('/diagnosticos/{id}/ignorar', [VeiculoDiagnosticoController::class, 'ignorar']);
        });

        Route::get('/expediente', [ExpedienteController::class, 'index']);
        Route::get('/expediente/estado', [ExpedienteController::class, 'estado']);
        Route::post('/expediente/marcar', [ExpedienteController::class, 'marcar']);
        Route::patch('/expediente/{id}', [ExpedienteController::class, 'corrigir']);

        Route::middleware('permission:expediente,visualizar')->group(function () {
            Route::get('/expediente-estatisticas', [ExpedienteController::class, 'estatisticas']);
        });

        Route::get('/recibos-verdes', [ReciboVerdeController::class, 'index']);
        Route::get('/recibos-verdes/{id}', [ReciboVerdeController::class, 'show']);
        Route::get('/recibos-verdes/{id}/arquivo', [ReciboVerdeController::class, 'arquivo']);
        Route::get('/recibos-verdes/{id}/arquivo/download', [ReciboVerdeController::class, 'downloadArquivo']);
        Route::post('/recibos-verdes', [ReciboVerdeController::class, 'store']);

        Route::middleware('permission:recibos_verdes,configurar')->group(function () {
            Route::post('/recibos-verdes/{id}/validar', [ReciboVerdeController::class, 'approve']);
            Route::post('/recibos-verdes/{id}/rejeitar', [ReciboVerdeController::class, 'reject']);
        });

        Route::get('/registos-criminais', [RegistoCriminalController::class, 'index']);
        Route::get('/registos-criminais/{id}', [RegistoCriminalController::class, 'show']);
        Route::get('/registos-criminais/{id}/arquivo', [RegistoCriminalController::class, 'arquivo']);
        Route::get('/registos-criminais/{id}/arquivo/download', [RegistoCriminalController::class, 'downloadArquivo']);
        Route::post('/registos-criminais', [RegistoCriminalController::class, 'store']);

        Route::middleware('permission:registos_criminais,configurar')->group(function () {
            Route::post('/registos-criminais/{id}/validar', [RegistoCriminalController::class, 'approve']);
            Route::post('/registos-criminais/{id}/rejeitar', [RegistoCriminalController::class, 'reject']);
        });

        Route::get('/tenant-context', function (TenantContext $tenantContext) {
            return response()->json([
                'tenant_id' => $tenantContext->id(),
                'has_tenant' => $tenantContext->hasTenant(),
            ]);
        });

        Route::get('/dashboard', [DashboardController::class, 'show']);

        Route::middleware('permission:empresas,visualizar')->group(function () {
            Route::get('/empresas', [EmpresaController::class, 'index']);
            Route::get('/empresas/{id}', [EmpresaController::class, 'show']);
        });

        Route::middleware('permission:empresas,configurar')->group(function () {
            Route::post('/empresas', [EmpresaController::class, 'store']);
            Route::patch('/empresas/{id}', [EmpresaController::class, 'update']);
            Route::delete('/empresas/{id}', [EmpresaController::class, 'destroy']);
        });

        Route::middleware('permission:proprietarios,visualizar')->group(function () {
            Route::get('/proprietarios', [ProprietarioController::class, 'index']);
            Route::get('/proprietarios/{id}', [ProprietarioController::class, 'show']);
        });

        Route::middleware('permission:proprietarios,configurar')->group(function () {
            Route::post('/proprietarios', [ProprietarioController::class, 'store']);
            Route::patch('/proprietarios/{id}', [ProprietarioController::class, 'update']);
            Route::patch('/proprietarios/{id}/status', [ProprietarioController::class, 'status']);
            Route::delete('/proprietarios/{id}', [ProprietarioController::class, 'destroy']);
            Route::post('/proprietarios/{id}/conta', [ProprietarioAccountController::class, 'store']);
            Route::patch('/proprietarios/{id}/conta/senha', [ProprietarioAccountController::class, 'password']);
        });

        Route::get('/veiculos', [VeiculoController::class, 'index']);
        Route::get('/veiculos/{id}', [VeiculoController::class, 'show']);

        Route::middleware('permission:veiculos,configurar')->group(function () {
            Route::post('/veiculos', [VeiculoController::class, 'store']);
            Route::patch('/veiculos/{id}', [VeiculoController::class, 'update']);
            Route::patch('/veiculos/{id}/status', [VeiculoController::class, 'status']);
            Route::delete('/veiculos/{id}', [VeiculoController::class, 'destroy']);
        });

        Route::middleware('permission:motoristas,visualizar')->group(function () {
            Route::get('/motoristas', [MotoristaController::class, 'index']);
            Route::get('/motoristas/{id}', [MotoristaController::class, 'show']);
        });

        Route::get(
            '/motoristas/{id}/foto',
            [MotoristaFotoController::class, 'show']
        )->name('motoristas.foto');

        Route::middleware('permission:motoristas,configurar')->group(function () {
            Route::post('/motoristas', [MotoristaController::class, 'store']);
            Route::post(
                '/motoristas/{id}/foto',
                [MotoristaFotoController::class, 'store']
            );
            Route::patch('/motoristas/{id}', [MotoristaController::class, 'update']);
            Route::patch('/motoristas/{id}/status', [MotoristaController::class, 'status']);
            Route::delete('/motoristas/{id}', [MotoristaController::class, 'destroy']);
            Route::post('/motoristas/{id}/conta', [MotoristaAccountController::class, 'store']);
            Route::patch('/motoristas/{id}/conta/senha', [MotoristaAccountController::class, 'password']);
        });

        Route::middleware('permission:alugueres,visualizar')->group(function () {
            Route::get('/alugueres', [AluguerController::class, 'index']);
            Route::get('/alugueres/{id}', [AluguerController::class, 'show']);
        });

        Route::middleware('permission:alugueres,configurar')->group(function () {
            Route::post('/alugueres', [AluguerController::class, 'store']);
            Route::patch('/alugueres/{id}', [AluguerController::class, 'update']);
            Route::post('/alugueres/{id}/ativar', [AluguerController::class, 'activate']);
            Route::post('/alugueres/{id}/finalizar', [AluguerController::class, 'finalize']);
            Route::post('/alugueres/{id}/finalizar-devolucao', [AluguerController::class, 'finalizeReturn']);
            Route::delete('/alugueres/{id}', [AluguerController::class, 'destroy']);
        });

        Route::get('/contratos', [ContratoController::class, 'index']);
        Route::get('/contratos/{id}', [ContratoController::class, 'show']);
        Route::get('/contratos/{id}/pdf', [ContratoController::class, 'pdf']);
        Route::get('/contratos/{id}/pdf/download', [ContratoController::class, 'downloadPdf']);

        Route::middleware('permission:contratos,configurar')->group(function () {
            Route::post('/contratos', [ContratoController::class, 'store']);
            Route::patch('/contratos/{id}', [ContratoController::class, 'update']);
            Route::patch('/contratos/{id}/encerrar', [ContratoController::class, 'encerrar']);
            Route::delete('/contratos/{id}', [ContratoController::class, 'destroy']);
            Route::get('/contratos/{id}/checklist-processo', [ChecklistProcessRunController::class, 'showForContrato']);
            Route::patch('/contratos/{id}/checklist-processo/items/{itemId}/concluir', [ChecklistProcessRunController::class, 'completeItem']);
            Route::post('/contratos/{id}/assinaturas/{assinaturaId}/reenviar', [ContratoController::class, 'resendRemoteSignature']);
            Route::post('/contratos/{id}/pdf', [ContratoController::class, 'generatePdf']);
        });

        Route::middleware('permission:declaracoes,visualizar')->group(function () {
            Route::get('/declaracoes', [DeclaracaoController::class, 'index']);
            Route::get('/declaracoes/{id}', [DeclaracaoController::class, 'show']);
            Route::get('/declaracoes/{id}/pdf', [DeclaracaoController::class, 'pdf']);
            Route::get('/declaracoes/{id}/pdf/download', [DeclaracaoController::class, 'downloadPdf']);
        });

        Route::middleware('permission:declaracoes,configurar')->group(function () {
            Route::post('/declaracoes', [DeclaracaoController::class, 'store']);
            Route::patch('/declaracoes/{id}', [DeclaracaoController::class, 'update']);
            Route::post('/declaracoes/{id}/emitir', [DeclaracaoController::class, 'issue']);
            Route::delete('/declaracoes/{id}', [DeclaracaoController::class, 'destroy']);
        });

        Route::middleware('permission:templates,visualizar')->group(function () {
            Route::get('/perfis-template', [PerfilTemplateController::class, 'index']);
            Route::get('/templates-contrato', [TemplateContratoController::class, 'index']);
            Route::get('/templates-contrato/{id}', [TemplateContratoController::class, 'show']);
            Route::get('/checklist-process-templates', [ChecklistProcessTemplateController::class, 'index']);
            Route::get('/checklist-process-templates/{id}', [ChecklistProcessTemplateController::class, 'show']);
        });

        Route::middleware('permission:templates,configurar')->group(function () {
            Route::post('/perfis-template', [PerfilTemplateController::class, 'store']);
            Route::patch('/perfis-template/{id}', [PerfilTemplateController::class, 'update']);
            Route::delete('/perfis-template/{id}', [PerfilTemplateController::class, 'destroy']);

            Route::post(
                '/templates-contrato/texto/preview',
                [
                    TemplateImportController::class,
                    'previewText',
                ]
            );
            Route::post(
                '/templates-contrato/texto',
                [
                    TemplateImportController::class,
                    'storeText',
                ]
            );

            Route::post(
                '/templates-contrato/importar/preview',
                [
                    TemplateImportController::class,
                    'preview',
                ]
            );

            Route::post(
                '/templates-contrato/importar',
                [
                    TemplateImportController::class,
                    'store',
                ]
            );

            Route::post(
                '/templates-contrato',
                [
                    TemplateContratoController::class,
                    'store',
                ]
            );

            Route::patch(
                '/templates-contrato/{id}',
                [
                    TemplateContratoController::class,
                    'update',
                ]
            );

            Route::delete(
                '/templates-contrato/{id}',
                [
                    TemplateContratoController::class,
                    'destroy',
                ]
            );

            Route::post(
                '/checklist-process-templates',
                [
                    ChecklistProcessTemplateController::class,
                    'store',
                ]
            );

            Route::patch(
                '/checklist-process-templates/{id}',
                [
                    ChecklistProcessTemplateController::class,
                    'update',
                ]
            );

            Route::delete(
                '/checklist-process-templates/{id}',
                [
                    ChecklistProcessTemplateController::class,
                    'destroy',
                ]
            );
        });
        Route::middleware('permission:checklist,visualizar')->group(function () {
            Route::get(
                '/checklists',
                [ChecklistRecordController::class, 'index']
            );

            Route::get(
                '/checklists/{id}',
                [ChecklistRecordController::class, 'show']
            )->whereUuid('id');
        });

        Route::middleware('permission:checklist,configurar')->group(function () {
            Route::post(
                '/checklists',
                [ChecklistRecordController::class, 'store']
            );

            Route::patch(
                '/checklists/{id}',
                [ChecklistRecordController::class, 'update']
            )->whereUuid('id');

            Route::post(
                '/checklists/{id}/finalizar',
                [ChecklistRecordController::class, 'finalize']
            )->whereUuid('id');

            Route::delete(
                '/checklists/{id}',
                [ChecklistRecordController::class, 'destroy']
            )->whereUuid('id');
        });

        Route::get('/multas', [MultaController::class, 'index']);
        Route::get('/multas/{id}', [MultaController::class, 'show']);
        Route::get('/multas/{id}/documentos/{documentoId}/arquivo', [MultaController::class, 'arquivo']);
        Route::get('/multas/{id}/documentos/{documentoId}/arquivo/download', [MultaController::class, 'downloadArquivo']);

        Route::middleware('permission:multas,configurar')->group(function () {
            Route::post('/multas', [MultaController::class, 'store']);
            Route::patch('/multas/{id}', [MultaController::class, 'update']);
            Route::delete('/multas/{id}', [MultaController::class, 'destroy']);
            Route::post('/multas/{id}/documentos', [MultaController::class, 'storeDocumento']);
            Route::delete('/multas/{id}/documentos/{documentoId}', [MultaController::class, 'destroyDocumento']);
        });

        Route::get('/sinistros', [SinistroController::class, 'index']);
        Route::get('/sinistros/{id}', [SinistroController::class, 'show']);
        Route::get('/sinistros/{id}/documentos/{documentoId}/arquivo', [SinistroController::class, 'arquivo']);
        Route::get('/sinistros/{id}/documentos/{documentoId}/arquivo/download', [SinistroController::class, 'downloadArquivo']);

        Route::get('/manutencoes', [ManutencaoController::class, 'index']);
        Route::get('/manutencoes/{id}', [ManutencaoController::class, 'show']);
        Route::get('/manutencoes/{id}/documentos/{documentoId}/arquivo', [ManutencaoController::class, 'arquivo']);
        Route::get('/manutencoes/{id}/documentos/{documentoId}/arquivo/download', [ManutencaoController::class, 'downloadArquivo']);

        Route::middleware('permission:manutencao,configurar')->group(function () {
            Route::post('/manutencoes', [ManutencaoController::class, 'store']);
            Route::patch('/manutencoes/{id}', [ManutencaoController::class, 'update']);
            Route::delete('/manutencoes/{id}', [ManutencaoController::class, 'destroy']);
            Route::post('/manutencoes/{id}/itens', [ManutencaoController::class, 'storeItem']);
            Route::patch('/manutencoes/{id}/itens/{itemId}', [ManutencaoController::class, 'updateItem']);
            Route::delete('/manutencoes/{id}/itens/{itemId}', [ManutencaoController::class, 'destroyItem']);
            Route::post('/manutencoes/{id}/agendar', [ManutencaoController::class, 'agendar']);
            Route::post('/manutencoes/{id}/iniciar', [ManutencaoController::class, 'iniciar']);
            Route::post('/manutencoes/{id}/aguardar-pecas', [ManutencaoController::class, 'aguardarPecas']);
            Route::post('/manutencoes/{id}/retomar', [ManutencaoController::class, 'retomar']);
            Route::post('/manutencoes/{id}/concluir', [ManutencaoController::class, 'concluir']);
            Route::post('/manutencoes/{id}/cancelar', [ManutencaoController::class, 'cancelar']);
            Route::post('/checklists/{checklistId}/manutencao', [ManutencaoController::class, 'fromChecklist']);
            Route::post('/sinistros/{sinistroId}/manutencao', [ManutencaoController::class, 'fromSinistro']);
            Route::post('/diagnosticos/{diagnosticoId}/manutencao', [ManutencaoController::class, 'fromDiagnostico']);
            Route::post('/manutencoes/{id}/documentos', [ManutencaoController::class, 'storeDocumento']);
            Route::post('/manutencoes/{id}/documentos/{documentoId}/processar', [ManutencaoController::class, 'processarDocumento']);
            Route::post('/manutencoes/{id}/documentos/{documentoId}/ocr', [ManutencaoController::class, 'registrarOcr']);
            Route::delete('/manutencoes/{id}/documentos/{documentoId}', [ManutencaoController::class, 'destroyDocumento']);
            Route::post('/manutencoes/{id}/aprovacoes', [ManutencaoController::class, 'solicitarAprovacao']);
            Route::post('/manutencoes/{id}/aprovacoes/{aprovacaoId}/responder', [ManutencaoController::class, 'responderAprovacaoInterna']);
            Route::post('/manutencoes/{id}/garantias/{garantiaId}/utilizar', [ManutencaoController::class, 'utilizarGarantia']);
        });

        Route::middleware('permission:sinistros,configurar')->group(function () {
            Route::post('/sinistros', [SinistroController::class, 'store']);
            Route::patch('/sinistros/{id}', [SinistroController::class, 'update']);
            Route::delete('/sinistros/{id}', [SinistroController::class, 'destroy']);
            Route::post('/sinistros/{id}/documentos', [SinistroController::class, 'storeDocumento']);
            Route::delete('/sinistros/{id}/documentos/{documentoId}', [SinistroController::class, 'destroyDocumento']);
        });
    });
});

require __DIR__.'/backoffice_ads.php';
require __DIR__.'/ads.php';
require __DIR__.'/documentos.php';
require __DIR__.'/portal_checklists.php';
require __DIR__.'/contratos_config.php';
require __DIR__.'/checklists_workflow.php';
require __DIR__.'/backoffice_content.php';
require __DIR__.'/public_analytics.php';
require __DIR__.'/modelos_documento_saas.php';

require __DIR__.'/checklist_process_presets.php';

require __DIR__.'/productivity.php';
