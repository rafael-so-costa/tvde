<?php

use App\Http\Controllers\Backoffice\BackofficeDocumentoController;
use App\Http\Controllers\DocumentoController;
use Illuminate\Support\Facades\Route;

Route::middleware([
    'auth:sanctum',
    'tenant',
    'permission:documentos,visualizar',
])
    ->prefix(
        'documentos'
    )
    ->group(
        function () {
            Route::get(
                '/resumo',
                [
                    DocumentoController::class,
                    'summary',
                ]
            );

            Route::get(
                '/meta',
                [
                    DocumentoController::class,
                    'meta',
                ]
            );

            Route::get(
                '/',
                [
                    DocumentoController::class,
                    'index',
                ]
            );

            Route::get(
                '/{identifier}',
                [
                    DocumentoController::class,
                    'show',
                ]
            );

            Route::get(
                '/{identifier}/arquivo',
                [
                    DocumentoController::class,
                    'file',
                ]
            );

            Route::get(
                '/{identifier}/download',
                [
                    DocumentoController::class,
                    'download',
                ]
            );
        }
    );

Route::middleware([
    'auth:sanctum',
    'super_admin',
])
    ->prefix(
        'backoffice/documentos'
    )
    ->group(
        function () {
            Route::get(
                '/',
                [
                    BackofficeDocumentoController::class,
                    'index',
                ]
            );

            Route::get(
                '/{identifier}',
                [
                    BackofficeDocumentoController::class,
                    'show',
                ]
            );

            Route::get(
                '/{identifier}/arquivo',
                [
                    BackofficeDocumentoController::class,
                    'file',
                ]
            );

            Route::get(
                '/{identifier}/download',
                [
                    BackofficeDocumentoController::class,
                    'download',
                ]
            );
        }
    );
