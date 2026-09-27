<?php

use App\Http\Controllers\AuthController;
use Illuminate\Support\Facades\Route;

Route::view('/', 'site.home')
    ->name('site.home');

Route::view('/registar', 'site.register')
    ->name('site.register');

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
