<?php

use App\Http\Controllers\Ads\AdDeliveryController;
use App\Http\Controllers\Ads\AdTrackingController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Ads\CommercialSalesStatusController;

Route::get(
    '/ads/commercial-status',
    [CommercialSalesStatusController::class, 'show']
)->middleware('throttle:60,1');

Route::get(
    '/ads/serve/public',
    [
        AdDeliveryController::class,
        'servePublic',
    ]
)
    ->middleware(
        'throttle:120,1'
    );

Route::middleware([
    'auth:sanctum',
    'tenant',
])
    ->get(
        '/ads/serve',
        [
            AdDeliveryController::class,
            'serveAuthenticated',
        ]
    )
    ->middleware(
        'throttle:120,1'
    );

Route::post(
    '/ads/view',
    [
        AdTrackingController::class,
        'view',
    ]
)
    ->middleware(
        'throttle:240,1'
    );

Route::get(
    '/ads/c/{token}',
    [
        AdTrackingController::class,
        'click',
    ]
)
    ->where(
        'token',
        '[A-Za-z0-9]{64}'
    )
    ->middleware(
        'throttle:240,1'
    )
    ->name(
        'ads.click'
    );
