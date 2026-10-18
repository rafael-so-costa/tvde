<?php

use App\Http\Controllers\ChecklistRemoteSignatureController;
use Illuminate\Support\Facades\Route;

Route::get(
    '/checklists/assinaturas/remotas/{token}',
    [
        ChecklistRemoteSignatureController::class,
        'show',
    ]
)
    ->whereUuid('token')
    ->middleware('throttle:30,1');

Route::post(
    '/checklists/assinaturas/remotas/{token}/confirmar',
    [
        ChecklistRemoteSignatureController::class,
        'confirm',
    ]
)
    ->whereUuid('token')
    ->middleware('throttle:5,1');

Route::middleware([
    'auth:sanctum',
    'tenant',
    'permission:checklist,configurar',
])->group(function(){
    Route::post(
        '/checklists/{id}/assinaturas/preparar',
        [
            ChecklistRemoteSignatureController::class,
            'prepare',
        ]
    )->whereUuid('id');
});