<?php

namespace App\Http\Controllers\Backoffice\Ads;

use App\Http\Controllers\Controller;
use App\Http\Requests\Ads\UpdateBackofficeAdSettingsRequest;
use App\Models\AdSetting;
use Illuminate\Http\JsonResponse;

class BackofficeAdSettingsController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json([
            'data' => $this->settings(),
        ]);
    }

    public function update(
        UpdateBackofficeAdSettingsRequest $request
    ): JsonResponse {
        $settings = $this->settings();

        $settings->fill(
            $request->validated()
        );

        $settings->save();

        return response()->json([
            'message' => 'Configurações de publicidade atualizadas.',
            'data' => $settings->fresh(),
        ]);
    }

    private function settings(): AdSetting
    {
        return AdSetting::query()->firstOrCreate(
            ['scope' => 'global'],
            [
                'tenant_internal_free_enabled' => true,
                'tenant_internal_requires_approval' => true,
                'tenant_internal_max_active' => 3,
                'tenant_internal_max_days' => 30,
                'tenant_internal_allow_partners' => true,
                'public_marketplace_enabled' => true,
                'manager_panel_external_ads_enabled' => false,
                'saas_inventory_reserved_percent' => 30,
                'default_frequency_cap_daily' => 3,
                'currency' => 'EUR',
            ]
        );
    }
}
