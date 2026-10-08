<?php

use App\Http\Controllers\PublicAnalyticsController;
use Illuminate\Support\Facades\Route;

Route::post(
    '/analytics/event',
    [PublicAnalyticsController::class,'store']
)->middleware('throttle:240,1');
