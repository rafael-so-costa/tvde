<?php

use App\Http\Controllers\BackofficeCouponCheckoutController;
use Illuminate\Support\Facades\Route;

Route::middleware([
    'auth:sanctum',
    'super_admin',
])
    ->prefix('backoffice/faturacao/cupoes')
    ->group(function (): void {
        Route::get(
            '/estado',
            [BackofficeCouponCheckoutController::class, 'status']
        );

        Route::post(
            '/cotacao',
            [BackofficeCouponCheckoutController::class, 'quote']
        )->middleware('throttle:30,1');

        Route::post(
            '/emitir',
            [BackofficeCouponCheckoutController::class, 'checkout']
        )->middleware('throttle:10,1');
    });