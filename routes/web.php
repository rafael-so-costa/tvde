<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\SaasRegistrationController;
use Illuminate\Support\Facades\Route;

Route::view('/', 'site.home')
    ->name('site.home');

Route::view('/registar', 'site.register')
    ->name('site.register');

Route::post(
    '/registar',
    [SaasRegistrationController::class, 'store']
)
    ->middleware('throttle:5,1')
    ->name('site.register.store');

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
