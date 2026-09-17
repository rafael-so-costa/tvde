<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\EmpresaController;
use App\Services\TenantContext;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'me']);

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
    });
});
