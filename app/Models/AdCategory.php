<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AdCategory extends Model
{
    use HasUuids;

    protected $fillable = [
        'parent_id',
        'slug',
        'name',
        'description',
        'active',
        'allowed_on_public',
        'requires_special_review',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'allowed_on_public' => 'boolean',
            'requires_special_review' => 'boolean',
        ];
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    public function campaigns(): HasMany
    {
        return $this->hasMany(AdCampaign::class, 'category_id');
    }
}
