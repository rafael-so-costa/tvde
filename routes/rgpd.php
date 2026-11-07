<?php

declare(strict_types=1);

use App\Http\Controllers\RgpdRegistoController;
use Illuminate\Support\Facades\Route;

/*
 * FROTAPRO_4R91_RGPD_ROUTES
 *
 * Autenticacao obrigatoria.
 * Contexto tenant obrigatorio.
 * Permissoes do modulo de templates.
 *
 * As rotas estao adicionalmente
 * protegidas por rgpd.api_enabled=false.
 *
 * Assinatura publica ainda nao exposta.
 */

Route::middleware([
    'auth:sanctum',
    'tenant',
])
    ->prefix('rgpd')
    ->group(function (): void {

        Route::middleware(
            'permission:templates,visualizar'
        )->group(function (): void {

            Route::get(
                '/',
                [
                    RgpdRegistoController::class,
                    'index',
                ]
            );

            Route::get(
                '/{id}',
                [
                    RgpdRegistoController::class,
                    'show',
                ]
            )->whereUuid('id');
        });

        Route::middleware(
            'permission:templates,configurar'
        )->group(function (): void {

            Route::post(
                '/rascunhos',
                [
                    RgpdRegistoController::class,
                    'store',
                ]
            );

            Route::post(
                '/{id}/assinatura/preparar',
                [
                    RgpdRegistoController::class,
                    'prepararAssinatura',
                ]
            )->whereUuid('id');

            Route::post(
                '/{id}/escolhas/{finalidade}/revogar',
                [
                    RgpdRegistoController::class,
                    'revogarRascunho',
                ]
            )
                ->whereUuid('id')
                ->where(
                    'finalidade',
                    'imagem|voz|localizacao|dados_sensiveis'
                );
        });
    });
