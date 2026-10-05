<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdDailyStat extends Model
{
    use HasUuids;

    protected $fillable = [
        'campaign_id',
        'creative_id',
        'zone_id',
        'surface',
        'date',
        'impressions',
        'viewable_impressions',
        'unique_impressions',
        'clicks',
        'unique_clicks',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'impressions' => 'integer',
            'viewable_impressions' => 'integer',
            'unique_impressions' => 'integer',
            'clicks' => 'integer',
            'unique_clicks' => 'integer',
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

    public function zone(): BelongsTo
    {
        return $this->belongsTo(
            AdZone::class
        );
    }
}
