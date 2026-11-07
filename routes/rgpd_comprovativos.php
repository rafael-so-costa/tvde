<?php

declare(strict_types=1);

use App\Http\Controllers\RgpdComprovativoController;
use Illuminate\Support\Facades\Route;

/*
 * FROTAPRO_4R102_PRIVATE_PDF_ROUTES
 *
 * Administracao:
 * - emitir: permissao configurar
 * - descarregar: permissao visualizar
 *
 * Titular:
 * - comprovacao da identidade
 *   atraves do vinculo user_id.
 *
 * Todos os acessos exigem
 * autenticacao e contexto tenant.
 */

Route::middleware([
    'auth:sanctum',
    'tenant',
])
    ->group(function (): void {

        Route::middleware(
            'permission:templates,configurar'
        )
            ->post(
                '/rgpd/{id}/comprovativo/emitir',
                [
                    RgpdComprovativoController::class,
                    'emitir',
                ]
            )
            ->whereUuid('id');

        Route::middleware(
            'permission:templates,visualizar'
        )
            ->get(
                '/rgpd/{id}/comprovativo',
                [
                    RgpdComprovativoController::class,
                    'descarregar',
                ]
            )
            ->whereUuid('id');

        Route::get(
            '/rgpd/titular/{id}/comprovativo',
            [
                RgpdComprovativoController::class,
                'descarregarTitular',
            ]
        )->whereUuid('id');
    });
