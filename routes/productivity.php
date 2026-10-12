<?php

use App\Http\Controllers\ProductivityController;
use Illuminate\Support\Facades\Route;

Route::middleware([
    'auth:sanctum',
    'tenant',
])
    ->prefix(
        'produtividade'
    )
    ->group(
        function () {
            Route::get(
                '/busca',
                [
                    ProductivityController::class,
                    'search',
                ]
            );

            Route::get(
                '/favoritos',
                [
                    ProductivityController::class,
                    'favorites',
                ]
            );

            Route::post(
                '/favoritos',
                [
                    ProductivityController::class,
                    'storeFavorite',
                ]
            );

            Route::delete(
                '/favoritos/{id}',
                [
                    ProductivityController::class,
                    'destroyFavorite',
                ]
            )->whereUuid(
                'id'
            );
        }
    );
