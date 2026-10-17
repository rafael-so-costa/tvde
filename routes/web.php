<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\BlogController;
use App\Http\Controllers\PublicAdsController;
use App\Http\Controllers\SaasRegistrationController;
use App\Services\SeoService;
use Illuminate\Support\Facades\Route;

Route::get(
    '/',
    fn (SeoService $seoService) => view(
        'site.home',
        [
            'seo' => $seoService->resolve('home'),
        ]
    )
)->name('site.home');
Route::view('/termos', 'site.legal.terms')
    ->name('site.legal.terms');

Route::view('/privacidade', 'site.legal.privacy')
    ->name('site.legal.privacy');

Route::view('/cookies', 'site.legal.cookies')
    ->name('site.legal.cookies');

Route::get('/anuncios', [PublicAdsController::class, 'index'])
    ->name('site.ads.index');

Route::get('/blog', [BlogController::class, 'index'])
    ->name('site.blog.index');

Route::get('/blog/{slug}', [BlogController::class, 'show'])
    ->name('site.blog.show');

Route::view('/registar', 'site.register')
    ->name('site.register');

Route::post('/registar', [SaasRegistrationController::class, 'store'])
    ->middleware('throttle:5,1')
    ->name('site.register.store');

Route::view('/login', 'app')->name('login');

Route::post('/login', [AuthController::class, 'login'])
    ->middleware('guest')
    ->name('login.store');

Route::post('/logout', [AuthController::class, 'logout'])
    ->middleware('auth')
    ->name('logout');

Route::view('/onboarding', 'app')
    ->name('app.onboarding');

Route::get('/{path?}', fn() => view('app'))
    ->where(
        'path',
        '^(?!api(?:/|$)|sanctum(?:/|$)|up$).*$'
    );
