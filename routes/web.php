<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\SaasRegistrationController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PublicAdsController;

Route::view('/', 'site.home')
    ->name('site.home');
Route::get(
    '/anuncios',
    [
        PublicAdsController::class,
        'index',
    ]
)
    ->name(
        'site.ads.index'
    );

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
