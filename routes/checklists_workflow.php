<?php

use App\Http\Controllers\ChecklistPendingController;
use App\Http\Controllers\ChecklistWorkflowActionController;
use App\Http\Controllers\ContratoRelacionadoController;
use Illuminate\Support\Facades\Route;

Route::middleware([
    'auth:sanctum',
    'tenant',
])->group(function () {
    Route::middleware(
        'permission:checklist,visualizar'
    )->group(function () {
        Route::get(
            '/checklists/pendentes',
            [ChecklistPendingController::class, 'index']
        );
    });

    Route::middleware(
        'permission:checklist,configurar'
    )->group(function () {
        Route::post(
            '/checklists/pendentes/{itemId}/iniciar',
            [ChecklistPendingController::class, 'start']
        )->whereUuid('itemId');
    });

    Route::middleware(
        'permission:contratos,configurar'
    )->group(function () {
        Route::get(
            '/contratos/{contratoId}/workflow/items/{itemId}/acao',
            [ChecklistWorkflowActionController::class, 'show']
        )
            ->whereUuid('contratoId')
            ->whereUuid('itemId');

        Route::post(
            '/contratos/{contratoId}/workflow/items/{itemId}/acao',
            [ChecklistWorkflowActionController::class, 'execute']
        )
            ->whereUuid('contratoId')
            ->whereUuid('itemId');

        Route::get(
            '/contratos/{contratoId}/workflow/items/{itemId}/contrato-relacionado',
            [ContratoRelacionadoController::class, 'show']
        )
            ->whereUuid('contratoId')
            ->whereUuid('itemId');

        Route::post(
            '/contratos/{contratoId}/workflow/items/{itemId}/contrato-relacionado/configurar-tipo',
            [ContratoRelacionadoController::class, 'configureTargetType']
        )
            ->whereUuid('contratoId')
            ->whereUuid('itemId');

        Route::post(
            '/contratos/{contratoId}/workflow/items/{itemId}/contrato-relacionado/vincular',
            [ContratoRelacionadoController::class, 'link']
        )
            ->whereUuid('contratoId')
            ->whereUuid('itemId');
    });
});
