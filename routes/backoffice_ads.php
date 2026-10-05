<?php

use App\Http\Controllers\Backoffice\Ads\BackofficeAdCampaignController;
use App\Http\Controllers\Backoffice\Ads\BackofficeAdCatalogController;
use App\Http\Controllers\Backoffice\Ads\BackofficeAdCreativeController;
use App\Http\Controllers\Backoffice\Ads\BackofficeAdDashboardController;
use App\Http\Controllers\Backoffice\Ads\BackofficeAdOrderController;
use App\Http\Controllers\Backoffice\Ads\BackofficeAdSettingsController;
use Illuminate\Support\Facades\Route;

Route::middleware([
    'auth:sanctum',
    'super_admin',
])
    ->prefix('backoffice/ads')
    ->group(function () {
        Route::get('/dashboard', [BackofficeAdDashboardController::class, 'show']);

        Route::get('/settings', [BackofficeAdSettingsController::class, 'show']);
        Route::patch('/settings', [BackofficeAdSettingsController::class, 'update']);

        Route::get('/advertisers', [BackofficeAdCatalogController::class, 'advertisers']);
        Route::post('/advertisers', [BackofficeAdCatalogController::class, 'storeAdvertiser']);
        Route::patch('/advertisers/{id}', [BackofficeAdCatalogController::class, 'updateAdvertiser'])
            ->whereUuid('id');

        Route::get('/categories', [BackofficeAdCatalogController::class, 'categories']);
        Route::post('/categories', [BackofficeAdCatalogController::class, 'storeCategory']);
        Route::patch('/categories/{id}', [BackofficeAdCatalogController::class, 'updateCategory'])
            ->whereUuid('id');

        Route::get('/zones', [BackofficeAdCatalogController::class, 'zones']);
        Route::post('/zones', [BackofficeAdCatalogController::class, 'storeZone']);
        Route::patch('/zones/{id}', [BackofficeAdCatalogController::class, 'updateZone'])
            ->whereUuid('id');

        Route::get('/price-rules', [BackofficeAdCatalogController::class, 'priceRules']);
        Route::post('/price-rules', [BackofficeAdCatalogController::class, 'storePriceRule']);
        Route::patch('/price-rules/{id}', [BackofficeAdCatalogController::class, 'updatePriceRule'])
            ->whereUuid('id');
        Route::delete('/price-rules/{id}', [BackofficeAdCatalogController::class, 'destroyPriceRule'])
            ->whereUuid('id');

        Route::get('/campaigns', [BackofficeAdCampaignController::class, 'index']);
        Route::post('/campaigns', [BackofficeAdCampaignController::class, 'store']);
        Route::get('/campaigns/{id}', [BackofficeAdCampaignController::class, 'show'])
            ->whereUuid('id');
        Route::patch('/campaigns/{id}', [BackofficeAdCampaignController::class, 'update'])
            ->whereUuid('id');
        Route::post('/campaigns/{id}/action', [BackofficeAdCampaignController::class, 'action'])
            ->whereUuid('id');

        Route::post('/campaigns/{campaignId}/creatives', [BackofficeAdCreativeController::class, 'store'])
            ->whereUuid('campaignId');
        Route::post('/creatives/{id}', [BackofficeAdCreativeController::class, 'update'])
            ->whereUuid('id');
        Route::delete('/creatives/{id}', [BackofficeAdCreativeController::class, 'destroy'])
            ->whereUuid('id');

        Route::get('/orders', [BackofficeAdOrderController::class, 'index']);
    });
