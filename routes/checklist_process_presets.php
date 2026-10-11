<?php

use App\Http\Controllers\ChecklistProcessPresetController;
use Illuminate\Support\Facades\Route;

Route::middleware([
    'auth:sanctum',
    'tenant',
])
    ->prefix(
        'checklist-process-presets'
    )
    ->group(
        function (): void {
            Route::get(
                '/',
                [
                    ChecklistProcessPresetController::class,
                    'index',
                ]
            )->middleware(
                'permission:templates,visualizar'
            );

            Route::post(
                '/{code}/usar',
                [
                    ChecklistProcessPresetController::class,
                    'usePreset',
                ]
            )
                ->where(
                    'code',
                    '[a-z0-9_]+'
                )
                ->middleware(
                    'permission:templates,configurar'
                );
        }
    );