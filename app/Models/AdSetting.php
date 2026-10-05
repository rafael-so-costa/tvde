<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class AdSetting extends Model
{
    use HasUuids;

    protected $fillable = [
        'scope',
        'tenant_internal_free_enabled',
        'tenant_internal_requires_approval',
        'tenant_internal_max_active',
        'tenant_internal_max_days',
        'tenant_internal_allow_partners',
        'public_marketplace_enabled',
        'manager_panel_external_ads_enabled',
        'saas_inventory_reserved_percent',
        'default_frequency_cap_daily',
        'currency',
    ];

    protected function casts(): array
    {
        return [
            'tenant_internal_free_enabled' => 'boolean',
            'tenant_internal_requires_approval' => 'boolean',
            'tenant_internal_allow_partners' => 'boolean',
            'public_marketplace_enabled' => 'boolean',
            'manager_panel_external_ads_enabled' => 'boolean',
        ];
    }
}
