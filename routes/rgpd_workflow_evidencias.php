<?php

declare(strict_types=1);

use App\Http\Controllers\RgpdWorkflowEvidenciaController;
use Illuminate\Support\Facades\Route;

/*
 * FROTAPRO_4R1041_EVIDENCE_ROUTES
 *
 * Responsaveis: validar e conferir.
 * Titular autenticado: consultar e confirmar
 * a disponibilizacao do documento.
 */

Route::middleware([
    'auth:sanctum',
    'tenant',
])
    ->group(function (): void {

        Route::middleware(
            'permission:templates,configurar'
        )->group(function (): void {

            Route::get(
                '/rgpd/{id}/workflow/capacidades',
                [
                    RgpdWorkflowEvidenciaController::class,
                    'capacidades',
                ]
            )->whereUuid('id');

            Route::post(
                '/rgpd/{id}/workflow/validar',
                [
                    RgpdWorkflowEvidenciaController::class,
                    'validar',
                ]
            )->whereUuid('id');

            Route::post(
                '/rgpd/{id}/workflow/conferir',
                [
                    RgpdWorkflowEvidenciaController::class,
                    'conferir',
                ]
            )->whereUuid('id');
        });

        Route::get(
            '/rgpd/titular/{id}/documento',
            [
                RgpdWorkflowEvidenciaController::class,
                'documento',
            ]
        )->whereUuid('id');

        Route::post(
            '/rgpd/titular/{id}/disponibilizacao/confirmar',
            [
                RgpdWorkflowEvidenciaController::class,
                'confirmarDisponibilizacao',
            ]
        )
            ->whereUuid('id')
            ->middleware('throttle:10,1');
    });
