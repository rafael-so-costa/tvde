<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdPriceRule extends Model
{
    use HasUuids;

    protected $fillable = [
        'name',
        'zone_id',
        'category_id',
        'channel',
        'audience',
        'duration_days',
        'price',
        'currency',
        'priority',
        'active',
        'starts_at',
        'ends_at',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'active' => 'boolean',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    public function zone(): BelongsTo
    {
        return $this->belongsTo(AdZone::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(AdCategory::class);
    }
}
