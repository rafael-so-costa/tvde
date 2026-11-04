<?php

declare(strict_types=1);

use App\Http\Controllers\BackofficeCouponController;
use Illuminate\Support\Facades\Route;

// Autoriza exclusivamente Super Admin autenticado.
// Este endpoint nao emite, simula nem confirma pagamentos.
Route::middleware(['auth:sanctum', 'super_admin'])
    ->prefix('backoffice/cupoes')
    ->group(function (): void {
        Route::get('/', [BackofficeCouponController::class, 'index'])
            ->middleware('throttle:60,1');
        Route::post('/', [BackofficeCouponController::class, 'store'])
            ->middleware('throttle:12,1');
        Route::get('/{id}', [BackofficeCouponController::class, 'show'])
            ->whereUuid('id')->middleware('throttle:60,1');
        Route::patch('/{id}', [BackofficeCouponController::class, 'update'])
            ->whereUuid('id')->middleware('throttle:12,1');
        Route::get('/{id}/historico', [BackofficeCouponController::class, 'history'])
            ->whereUuid('id')->middleware('throttle:60,1');
    });