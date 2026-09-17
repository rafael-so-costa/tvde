<?php

use App\Http\Controllers\AuthController;
use App\Services\TenantContext;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'me']);

    Route::middleware('tenant')->get('/tenant-context', function (TenantContext $tenantContext) {
        return response()->json([
            'tenant_id' => $tenantContext->id(),
            'has_tenant' => $tenantContext->hasTenant(),
        ]);
    });
});
