<?php

use App\Http\Controllers\Backoffice\BackofficeAnalyticsController;
use App\Http\Controllers\Backoffice\BackofficeConteudoController;
use App\Http\Controllers\Backoffice\BackofficeSeoController;
use Illuminate\Support\Facades\Route;

Route::middleware([
    'auth:sanctum',
    'super_admin',
])->prefix('backoffice')->group(function(){
    Route::get('/seo',[BackofficeSeoController::class,'index']);
    Route::patch('/seo/{chave}',[BackofficeSeoController::class,'update']);

    Route::get('/conteudos',[BackofficeConteudoController::class,'index']);
    Route::post('/conteudos',[BackofficeConteudoController::class,'store']);
    Route::get('/conteudos/categorias',[BackofficeConteudoController::class,'categories']);
    Route::post('/conteudos/categorias',[BackofficeConteudoController::class,'storeCategory']);
    Route::get('/conteudos/{id}',[BackofficeConteudoController::class,'show'])->whereUuid('id');
    Route::patch('/conteudos/{id}',[BackofficeConteudoController::class,'update'])->whereUuid('id');
    Route::post('/conteudos/{id}/publicar',[BackofficeConteudoController::class,'publish'])->whereUuid('id');
    Route::post('/conteudos/{id}/arquivar',[BackofficeConteudoController::class,'archive'])->whereUuid('id');

    Route::get('/analytics',[BackofficeAnalyticsController::class,'dashboard']);
});
