<?php

use App\Http\Controllers\PortalChecklistController;
use Illuminate\Support\Facades\Route;

Route::middleware([
    'auth:sanctum',
    'tenant',
])
    ->prefix(
        'portal'
    )
    ->group(
        function () {
            Route::prefix(
                'motorista/checklists'
            )->group(
                function () {
                    Route::get(
                        '/',
                        [
                            PortalChecklistController::class,
                            'motoristaIndex',
                        ]
                    );

                    Route::get(
                        '/{id}',
                        [
                            PortalChecklistController::class,
                            'motoristaShow',
                        ]
                    )->whereUuid(
                        'id'
                    );

                    Route::get(
                        '/{id}/media/{mediaId}',
                        [
                            PortalChecklistController::class,
                            'motoristaMedia',
                        ]
                    )
                        ->whereUuid(
                            'id'
                        )
                        ->whereUuid(
                            'mediaId'
                        );
                }
            );

            Route::prefix(
                'proprietario/checklists'
            )->group(
                function () {
                    Route::get(
                        '/',
                        [
                            PortalChecklistController::class,
                            'proprietarioIndex',
                        ]
                    );

                    Route::get(
                        '/{id}',
                        [
                            PortalChecklistController::class,
                            'proprietarioShow',
                        ]
                    )->whereUuid(
                        'id'
                    );

                    Route::get(
                        '/{id}/media/{mediaId}',
                        [
                            PortalChecklistController::class,
                            'proprietarioMedia',
                        ]
                    )
                        ->whereUuid(
                            'id'
                        )
                        ->whereUuid(
                            'mediaId'
                        );
                }
            );
        }
    );
