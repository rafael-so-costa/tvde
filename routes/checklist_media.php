<?php

use App\Http\Controllers\ChecklistMediaController;
use Illuminate\Support\Facades\Route;

Route::middleware([
    'auth:sanctum',
    'tenant',
])->group(function(){
    Route::middleware(
        'permission:checklist,visualizar'
    )->group(function(){
        Route::get(
            '/checklists/{id}/media',
            [
                ChecklistMediaController::class,
                'index',
            ]
        )->whereUuid('id');

        Route::get(
            '/checklists/{id}/media/{mediaId}/arquivo',
            [
                ChecklistMediaController::class,
                'file',
            ]
        )
            ->whereUuid('id')
            ->whereUuid('mediaId');

        Route::get(
            '/checklists/{id}/media/{mediaId}/download',
            [
                ChecklistMediaController::class,
                'download',
            ]
        )
            ->whereUuid('id')
            ->whereUuid('mediaId');
    });

    Route::middleware(
        'permission:checklist,configurar'
    )->group(function(){
        Route::post(
            '/checklists/{id}/media',
            [
                ChecklistMediaController::class,
                'store',
            ]
        )->whereUuid('id');

        Route::delete(
            '/checklists/{id}/media/{mediaId}',
            [
                ChecklistMediaController::class,
                'destroy',
            ]
        )
            ->whereUuid('id')
            ->whereUuid('mediaId');
    });
});