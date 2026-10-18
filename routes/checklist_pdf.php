<?php

use App\Http\Controllers\ChecklistPdfController;
use Illuminate\Support\Facades\Route;

Route::middleware([
    'auth:sanctum',
    'tenant',
])->group(function(){
    Route::middleware(
        'permission:checklist,visualizar'
    )->group(function(){
        Route::get(
            '/checklists/{id}/pdf',
            [
                ChecklistPdfController::class,
                'pdf',
            ]
        )->whereUuid('id');

        Route::get(
            '/checklists/{id}/pdf/download',
            [
                ChecklistPdfController::class,
                'download',
            ]
        )->whereUuid('id');
    });

    Route::middleware(
        'permission:checklist,configurar'
    )->group(function(){
        Route::post(
            '/checklists/{id}/pdf/gerar',
            [
                ChecklistPdfController::class,
                'generate',
            ]
        )->whereUuid('id');
    });
});