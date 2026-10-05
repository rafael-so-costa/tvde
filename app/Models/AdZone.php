<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class AdZone extends Model
{
    use HasUuids;

    public const CHANNEL_DRIVER = 'driver_portal';

    public const CHANNEL_OWNER = 'owner_portal';

    public const CHANNEL_MANAGER = 'manager_panel';

    public const CHANNEL_PUBLIC = 'public_marketplace';

    protected $fillable = [
        'code',
        'name',
        'channel',
        'audience',
        'description',
        'max_concurrent_campaigns',
        'saas_reserved_percent',
        'allowed_sources',
        'allowed_categories',
        'active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'allowed_sources' => 'array',
            'allowed_categories' => 'array',
            'active' => 'boolean',
        ];
    }

    public static function channels(): array
    {
        return [
            self::CHANNEL_DRIVER,
            self::CHANNEL_OWNER,
            self::CHANNEL_MANAGER,
            self::CHANNEL_PUBLIC,
        ];
    }

    public function campaigns(): BelongsToMany
    {
        return $this->belongsToMany(
            AdCampaign::class,
            'ad_campaign_zone',
            'zone_id',
            'campaign_id'
        );
    }
}
