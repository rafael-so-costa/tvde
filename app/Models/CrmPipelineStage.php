<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CrmPipelineStage extends Model
{
    use HasUuids;

    public const CATEGORY_PIPELINE = 'pipeline';

    public const CATEGORY_WON = 'won';

    public const CATEGORY_LOST = 'lost';

    protected $fillable = [
        'code',
        'name',
        'category',
        'color',
        'position',
        'is_default',
        'is_terminal',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'position' => 'integer',
            'is_default' => 'boolean',
            'is_terminal' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function leads(): HasMany
    {
        return $this->hasMany(
            CrmLead::class,
            'current_stage_id'
        );
    }

    public function historiesFrom(): HasMany
    {
        return $this->hasMany(
            CrmLeadStageHistory::class,
            'from_stage_id'
        );
    }

    public function historiesTo(): HasMany
    {
        return $this->hasMany(
            CrmLeadStageHistory::class,
            'to_stage_id'
        );
    }
}
