<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\EmpresaController;
use App\Http\Controllers\ProprietarioAccountController;
use App\Http\Controllers\ProprietarioController;
use App\Http\Controllers\VeiculoController;
use App\Services\TenantContext;
use App\Http\Controllers\MotoristaController;
use App\Http\Controllers\MotoristaAccountController;
use App\Http\Controllers\AluguerController;
use App\Http\Controllers\ContratoController;
use App\Http\Controllers\PerfilTemplateController;
use App\Http\Controllers\TemplateContratoController;
use App\Http\Controllers\TemplateImportController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\RemoteSignatureController;
use App\Http\Controllers\TenantContextController;
use App\Http\Controllers\ChecklistRecordController;
use App\Http\Controllers\ChecklistProcessTemplateController;
use App\Http\Controllers\ChecklistProcessRunController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DeclaracaoController;
use App\Http\Controllers\RegistoCriminalController;
use App\Http\Controllers\ReciboVerdeController;
use App\Http\Controllers\ExpedienteController;
use App\Http\Controllers\ExpedientePublicController;
use App\Http\Controllers\MultaController;


Route::get(
    '/assinaturas/remotas/{token}',
    [RemoteSignatureController::class, 'show']
)
    ->whereUuid('token')
    ->middleware('throttle:30,1');

Route::post(
    '/assinaturas/remotas/{token}/confirmar',
    [RemoteSignatureController::class, 'confirm']
)
    ->whereUuid('token')
    ->middleware('throttle:5,1');

Route::post(
    '/expediente/publico/marcar',
    [ExpedientePublicController::class, 'marcar']
)->middleware('throttle:10,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'me']);
    Route::get(
        '/tenant-options',
        [TenantContextController::class, 'options']
    );

    Route::post(
        '/tenant-context',
        [TenantContextController::class, 'select']
    );

    Route::delete(
        '/tenant-context',
        [TenantContextController::class, 'clear']
    );

    Route::middleware('tenant')->group(function () {
        Route::get('/expediente', [ExpedienteController::class, 'index']);
        Route::get('/expediente/estado', [ExpedienteController::class, 'estado']);
        Route::post('/expediente/marcar', [ExpedienteController::class, 'marcar']);
        Route::patch('/expediente/{id}', [ExpedienteController::class, 'corrigir']);

        Route::middleware('permission:expediente,visualizar')->group(function () {
            Route::get(
                '/expediente-estatisticas',
                [ExpedienteController::class, 'estatisticas']
            );
        });
        Route::get(
            '/recibos-verdes',
            [ReciboVerdeController::class, 'index']
        );

        Route::get(
            '/recibos-verdes/{id}',
            [ReciboVerdeController::class, 'show']
        );

        Route::get(
            '/recibos-verdes/{id}/arquivo',
            [ReciboVerdeController::class, 'arquivo']
        );

        Route::get(
            '/recibos-verdes/{id}/arquivo/download',
            [ReciboVerdeController::class, 'downloadArquivo']
        );

        Route::post(
            '/recibos-verdes',
            [ReciboVerdeController::class, 'store']
        );

        Route::middleware(
            'permission:recibos_verdes,configurar'
        )->group(function () {
            Route::post(
                '/recibos-verdes/{id}/validar',
                [ReciboVerdeController::class, 'approve']
            );

            Route::post(
                '/recibos-verdes/{id}/rejeitar',
                [ReciboVerdeController::class, 'reject']
            );
        });
        Route::get(
            '/registos-criminais',
            [RegistoCriminalController::class, 'index']
        );

        Route::get(
            '/registos-criminais/{id}',
            [RegistoCriminalController::class, 'show']
        );

        Route::get(
            '/registos-criminais/{id}/arquivo',
            [RegistoCriminalController::class, 'arquivo']
        );

        Route::get(
            '/registos-criminais/{id}/arquivo/download',
            [RegistoCriminalController::class, 'downloadArquivo']
        );

        Route::post(
            '/registos-criminais',
            [RegistoCriminalController::class, 'store']
        );

        Route::middleware(
            'permission:registos_criminais,configurar'
        )->group(function () {
            Route::post(
                '/registos-criminais/{id}/validar',
                [RegistoCriminalController::class, 'approve']
            );

            Route::post(
                '/registos-criminais/{id}/rejeitar',
                [RegistoCriminalController::class, 'reject']
            );
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

            Route::post(
                '/proprietarios/{id}/conta',
                [ProprietarioAccountController::class, 'store']
            );

            Route::patch(
                '/proprietarios/{id}/conta/senha',
                [ProprietarioAccountController::class, 'password']
            );
        });

        Route::middleware('permission:veiculos,visualizar')->group(function () {
            Route::get('/veiculos', [VeiculoController::class, 'index']);
            Route::get('/veiculos/{id}', [VeiculoController::class, 'show']);
        });

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

        Route::middleware('permission:motoristas,configurar')->group(function () {
            Route::post('/motoristas', [MotoristaController::class, 'store']);
            Route::patch('/motoristas/{id}', [MotoristaController::class, 'update']);
            Route::patch('/motoristas/{id}/status', [MotoristaController::class, 'status']);
            Route::delete('/motoristas/{id}', [MotoristaController::class, 'destroy']);

            Route::post(
                '/motoristas/{id}/conta',
                [MotoristaAccountController::class, 'store']
            );

            Route::patch(
                '/motoristas/{id}/conta/senha',
                [MotoristaAccountController::class, 'password']
            );
        });
        Route::middleware('permission:alugueres,visualizar')->group(function () {
            Route::get('/alugueres', [AluguerController::class, 'index']);
            Route::get('/alugueres/{id}', [AluguerController::class, 'show']);
        });

        Route::middleware('permission:alugueres,configurar')->group(function () {
            Route::post(
                '/alugueres',
                [AluguerController::class, 'store']
            );

            Route::patch(
                '/alugueres/{id}',
                [AluguerController::class, 'update']
            );

            Route::post(
                '/alugueres/{id}/ativar',
                [AluguerController::class, 'activate']
            );

            Route::post(
                '/alugueres/{id}/finalizar',
                [AluguerController::class, 'finalize']
            );

            Route::post(
                '/alugueres/{id}/finalizar-devolucao',
                [AluguerController::class, 'finalizeReturn']
            );

            Route::delete(
                '/alugueres/{id}',
                [AluguerController::class, 'destroy']
            );
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
            Route::get(
                '/contratos/{id}/checklist-processo',
                [
                    ChecklistProcessRunController::class,
                    'showForContrato',
                ]
            );

            Route::patch(
                '/contratos/{id}/checklist-processo/items/{itemId}/concluir',
                [
                    ChecklistProcessRunController::class,
                    'completeItem',
                ]
            );
            Route::post(
                '/contratos/{id}/assinaturas/{assinaturaId}/reenviar',
                [
                    ContratoController::class,
                    'resendRemoteSignature',
                ]
            );
            Route::post(
                '/contratos/{id}/pdf',
                [ContratoController::class, 'generatePdf']
            );
        });
        Route::middleware(
            'permission:declaracoes,visualizar'
        )->group(function () {
            Route::get(
                '/declaracoes',
                [DeclaracaoController::class, 'index']
            );

            Route::get(
                '/declaracoes/{id}',
                [DeclaracaoController::class, 'show']
            );

            Route::get(
                '/declaracoes/{id}/pdf',
                [DeclaracaoController::class, 'pdf']
            );

            Route::get(
                '/declaracoes/{id}/pdf/download',
                [DeclaracaoController::class, 'downloadPdf']
            );
        });

        Route::middleware(
            'permission:declaracoes,configurar'
        )->group(function () {
            Route::post(
                '/declaracoes',
                [DeclaracaoController::class, 'store']
            );

            Route::patch(
                '/declaracoes/{id}',
                [DeclaracaoController::class, 'update']
            );

            Route::post(
                '/declaracoes/{id}/emitir',
                [DeclaracaoController::class, 'issue']
            );

            Route::delete(
                '/declaracoes/{id}',
                [DeclaracaoController::class, 'destroy']
            );
        });
        Route::middleware('permission:templates,visualizar')->group(function () {
            Route::get('/perfis-template', [PerfilTemplateController::class, 'index']);
            Route::get('/templates-contrato', [TemplateContratoController::class, 'index']);
            Route::get('/templates-contrato/{id}', [TemplateContratoController::class, 'show']);
            Route::get(
                '/checklist-process-templates',
                [
                    ChecklistProcessTemplateController::class,
                    'index',
                ]
            );

            Route::get(
                '/checklist-process-templates/{id}',
                [
                    ChecklistProcessTemplateController::class,
                    'show',
                ]
            );
        });

        Route::middleware('permission:templates,configurar')->group(function () {
            Route::post('/perfis-template', [PerfilTemplateController::class, 'store']);
            Route::patch('/perfis-template/{id}', [PerfilTemplateController::class, 'update']);
            Route::delete('/perfis-template/{id}', [PerfilTemplateController::class, 'destroy']);

            Route::post('/templates-contrato', [TemplateContratoController::class, 'store']);
            Route::patch('/templates-contrato/{id}', [TemplateContratoController::class, 'update']);
            Route::delete('/templates-contrato/{id}', [TemplateContratoController::class, 'destroy']);
            Route::post(
                '/templates-contrato/importar/preview',
                [TemplateImportController::class, 'preview']
            );
            Route::post(
                '/templates-contrato/importar',
                [TemplateImportController::class, 'store']
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
        Route::middleware(
            'permission:checklist,visualizar'
        )->group(function () {
            Route::get(
                '/checklists',
                [ChecklistRecordController::class, 'index']
            );

            Route::get(
                '/checklists/{id}',
                [ChecklistRecordController::class, 'show']
            );
        });

        Route::middleware(
            'permission:checklist,configurar'
        )->group(function () {
            Route::post(
                '/checklists',
                [ChecklistRecordController::class, 'store']
            );

            Route::patch(
                '/checklists/{id}',
                [ChecklistRecordController::class, 'update']
            );

            Route::post(
                '/checklists/{id}/finalizar',
                [ChecklistRecordController::class, 'finalize']
            );

            Route::delete(
                '/checklists/{id}',
                [ChecklistRecordController::class, 'destroy']
            );
        });
        Route::get('/multas', [MultaController::class, 'index']);
        Route::get('/multas/{id}', [MultaController::class, 'show']);

        Route::get(
            '/multas/{id}/documentos/{documentoId}/arquivo',
            [MultaController::class, 'arquivo']
        );

        Route::get(
            '/multas/{id}/documentos/{documentoId}/arquivo/download',
            [MultaController::class, 'downloadArquivo']
        );

        Route::middleware('permission:multas,configurar')->group(function () {
            Route::post('/multas', [MultaController::class, 'store']);

            Route::patch(
                '/multas/{id}',
                [MultaController::class, 'update']
            );

            Route::delete(
                '/multas/{id}',
                [MultaController::class, 'destroy']
            );

            Route::post(
                '/multas/{id}/documentos',
                [MultaController::class, 'storeDocumento']
            );

            Route::delete(
                '/multas/{id}/documentos/{documentoId}',
                [MultaController::class, 'destroyDocumento']
            );
        });
    });
});
