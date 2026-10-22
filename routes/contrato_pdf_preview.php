<?php

use App\Http\Controllers\ContratoPdfPreviewController;
use Illuminate\Support\Facades\Route;

Route::post(
    '/contratos/preview-pdf',
    ContratoPdfPreviewController::class
)
    ->middleware([
        'auth:sanctum',
        'tenant',
        'permission:contratos,configurar',
        'throttle:12,1',
    ])
    ->name('contratos.preview-pdf');
