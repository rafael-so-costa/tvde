<?php

declare(strict_types=1);

use App\Http\Controllers\RgpdWorkflowEstadoController;
use Illuminate\Support\Facades\Route;

/*
 * FROTAPRO_4R103_READ_ONLY_WORKFLOW
 *
 * Consulta de evidencias RGPD.
 * Nao conclui nem altera etapas.
 */
Route::middleware([
    'auth:sanctum',
    'tenant',
    'permission:templates,visualizar',
])
    ->get(
        '/rgpd/{id}/workflow',
        [
            RgpdWorkflowEstadoController::class,
            'show',
        ]
    )
    ->whereUuid('id');
