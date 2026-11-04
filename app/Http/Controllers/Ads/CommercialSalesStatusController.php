<?php

declare(strict_types=1);

namespace App\Http\Controllers\Ads;

use App\Http\Controllers\Controller;
use App\Services\Ads\AdCommercialSalesPolicy;
use Illuminate\Http\JsonResponse;

final class CommercialSalesStatusController extends Controller
{
    public function show(
        AdCommercialSalesPolicy $policy
    ): JsonResponse {
        return response()->json([
            'data' => [
                'commercial_ads_enabled' => $policy->enabled(),
                'public_ads_available' => true,
                'new_paid_campaigns_available' => $policy->enabled(),
            ],
        ]);
    }
}