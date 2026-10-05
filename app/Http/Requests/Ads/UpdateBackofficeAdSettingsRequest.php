<?php

namespace App\Http\Requests\Ads;

use Illuminate\Foundation\Http\FormRequest;

class UpdateBackofficeAdSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'tenant_internal_free_enabled' => ['required', 'boolean'],
            'tenant_internal_requires_approval' => ['required', 'boolean'],
            'tenant_internal_max_active' => ['required', 'integer', 'min:0', 'max:1000'],
            'tenant_internal_max_days' => ['required', 'integer', 'min:1', 'max:3650'],
            'tenant_internal_allow_partners' => ['required', 'boolean'],
            'public_marketplace_enabled' => ['required', 'boolean'],
            'manager_panel_external_ads_enabled' => ['required', 'boolean'],
            'saas_inventory_reserved_percent' => ['required', 'integer', 'min:0', 'max:100'],
            'default_frequency_cap_daily' => ['required', 'integer', 'min:1', 'max:100'],
            'currency' => ['required', 'string', 'size:3'],
        ];
    }
}
