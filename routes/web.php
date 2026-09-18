<?php

use App\Http\Controllers\AuthController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login'])
    ->middleware('guest');

Route::post('/logout', [AuthController::class, 'logout'])
    ->middleware('auth');

Route::get('/{path?}', function () {
    return view('app');
})
    ->where(
        'path',
        '^(?!api(?:/|$)|sanctum(?:/|$)|up$).*$'
    );
