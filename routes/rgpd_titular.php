<?php

declare(strict_types=1);

use App\Http\Controllers\RgpdTitularController;
use Illuminate\Support\Facades\Route;

/*
 * FROTAPRO_4R101_RGPD_SELF_SERVICE
 *
 * Nao exige permissao templates.
 * Exige que o utilizador autenticado
 * seja o proprio titular do registo.
 *
 * A API permanece desativada
 * em config/rgpd.php.
 */

Route::middleware([
    'auth:sanctum',
    'tenant',
])
    ->prefix('rgpd/titular')
    ->group(function (): void {

        Route::get(
            '/{id}/consentimentos',
            [
                RgpdTitularController::class,
                'show',
            ]
        )->whereUuid('id');

        Route::post(
            '/{id}/consentimentos/{finalidade}/retirar',
            [
                RgpdTitularController::class,
                'retirar',
            ]
        )
            ->whereUuid('id')
            ->where(
                'finalidade',
                'imagem|voz|localizacao|dados_sensiveis'
            );
    });
