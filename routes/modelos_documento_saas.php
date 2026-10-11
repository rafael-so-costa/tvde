<?php

use App\Http\Controllers\BackofficeModeloDocumentoSaasCategoriaController;
use App\Http\Controllers\BackofficeModeloDocumentoSaasController;
use App\Http\Controllers\ModeloDocumentoRecomendadoController;
use Illuminate\Support\Facades\Route;

Route::middleware([
    'auth:sanctum',
    'super_admin',
])
    ->prefix(
        'backoffice/modelos-documento'
    )
    ->group(
        function (): void {
            Route::get(
                '/categorias',
                [
                    BackofficeModeloDocumentoSaasCategoriaController::class,
                    'index',
                ]
            );

            Route::post(
                '/categorias',
                [
                    BackofficeModeloDocumentoSaasCategoriaController::class,
                    'store',
                ]
            );

            Route::patch(
                '/categorias/{id}',
                [
                    BackofficeModeloDocumentoSaasCategoriaController::class,
                    'update',
                ]
            )->whereUuid('id');

            Route::delete(
                '/categorias/{id}',
                [
                    BackofficeModeloDocumentoSaasCategoriaController::class,
                    'destroy',
                ]
            )->whereUuid('id');

            Route::get(
                '/',
                [
                    BackofficeModeloDocumentoSaasController::class,
                    'index',
                ]
            );

            Route::post(
                '/',
                [
                    BackofficeModeloDocumentoSaasController::class,
                    'store',
                ]
            );

            Route::get(
                '/metricas',
                [
                    BackofficeModeloDocumentoSaasController::class,
                    'metrics',
                ]
            );

            Route::get(
                '/{id}',
                [
                    BackofficeModeloDocumentoSaasController::class,
                    'show',
                ]
            )->whereUuid('id');

            Route::patch(
                '/{id}',
                [
                    BackofficeModeloDocumentoSaasController::class,
                    'update',
                ]
            )->whereUuid('id');

            Route::post(
                '/{id}/publicar',
                [
                    BackofficeModeloDocumentoSaasController::class,
                    'publish',
                ]
            )->whereUuid('id');

            Route::post(
                '/{id}/arquivar',
                [
                    BackofficeModeloDocumentoSaasController::class,
                    'archive',
                ]
            )->whereUuid('id');

            Route::get(
                '/{id}/versoes',
                [
                    BackofficeModeloDocumentoSaasController::class,
                    'versions',
                ]
            )->whereUuid('id');
        }
    );

Route::middleware([
    'auth:sanctum',
    'tenant',
])
    ->prefix(
        'modelos-recomendados'
    )
    ->group(
        function (): void {
            Route::middleware(
                'permission:templates,visualizar'
            )->group(
                function (): void {
                    Route::get(
                        '/',
                        [
                            ModeloDocumentoRecomendadoController::class,
                            'index',
                        ]
                    );

                    Route::get(
                        '/{id}',
                        [
                            ModeloDocumentoRecomendadoController::class,
                            'show',
                        ]
                    )->whereUuid('id');
                }
            );

            Route::post(
                '/{id}/usar',
                [
                    ModeloDocumentoRecomendadoController::class,
                    'useModel',
                ]
            )
                ->whereUuid('id')
                ->middleware(
                    'permission:templates,configurar'
                );
        }
    );
