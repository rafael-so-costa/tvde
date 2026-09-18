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
        Route::get('/tenant-context', function (TenantContext $tenantContext) {
            return response()->json([
                'tenant_id' => $tenantContext->id(),
                'has_tenant' => $tenantContext->hasTenant(),
            ]);
        });

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
            Route::post('/alugueres', [AluguerController::class, 'store']);
            Route::patch('/alugueres/{id}', [AluguerController::class, 'update']);
            Route::delete('/alugueres/{id}', [AluguerController::class, 'destroy']);
        });


        Route::get('/contratos', [ContratoController::class, 'index']);
        Route::get('/contratos/{id}', [ContratoController::class, 'show']);


        Route::middleware('permission:contratos,configurar')->group(function () {
            Route::post('/contratos', [ContratoController::class, 'store']);
            Route::patch('/contratos/{id}', [ContratoController::class, 'update']);
            Route::patch('/contratos/{id}/encerrar', [ContratoController::class, 'encerrar']);
            Route::delete('/contratos/{id}', [ContratoController::class, 'destroy']);
        });
        Route::middleware('permission:templates,visualizar')->group(function () {
            Route::get('/perfis-template', [PerfilTemplateController::class, 'index']);
            Route::get('/templates-contrato', [TemplateContratoController::class, 'index']);
            Route::get('/templates-contrato/{id}', [TemplateContratoController::class, 'show']);
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
        });
    });
});
