<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdDeliveryEvent extends Model
{
    use HasUuids;

    public const EVENT_SERVED = 'served';

    public const EVENT_VIEWABLE = 'viewable';

    public const EVENT_CLICKED = 'clicked';

    protected $fillable = [
        'delivery_token',
        'campaign_id',
        'creative_id',
        'tenant_id',
        'user_id',
        'surface',
        'event_type',
        'viewer_key',
        'occurred_at',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'occurred_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    public static function eventTypes(): array
    {
        return [
            self::EVENT_SERVED,
            self::EVENT_VIEWABLE,
            self::EVENT_CLICKED,
        ];
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(
            AdCampaign::class
        );
    }

    public function creative(): BelongsTo
    {
        return $this->belongsTo(
            AdCreative::class
        );
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(
            Tenant::class
        );
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(
            User::class
        );
    }
}
