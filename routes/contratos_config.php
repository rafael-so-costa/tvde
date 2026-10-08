<?php

use App\Http\Controllers\TipoContratoController;
use Illuminate\Support\Facades\Route;

Route::middleware([
    'auth:sanctum',
    'tenant',
])->prefix('tipos-contrato')->group(function(){
    Route::middleware(
        'permission:contratos,visualizar'
    )->group(function(){
        Route::get('/',[
            TipoContratoController::class,
            'index',
        ]);

        Route::get('/{id}',[
            TipoContratoController::class,
            'show',
        ])->whereUuid('id');
    });

    Route::middleware(
        'permission:contratos,configurar'
    )->group(function(){
        Route::post('/',[
            TipoContratoController::class,
            'store',
        ]);

        Route::patch('/{id}',[
            TipoContratoController::class,
            'update',
        ])->whereUuid('id');

        Route::post('/{id}/arquivar',[
            TipoContratoController::class,
            'archive',
        ])->whereUuid('id');
    });
});
