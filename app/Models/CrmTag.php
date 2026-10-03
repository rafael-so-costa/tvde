<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class CrmTag extends Model
{
    use HasUuids;

    protected $fillable = [
        'name',
        'slug',
        'color',
        'description',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function leads(): BelongsToMany
    {
        return $this
            ->belongsToMany(
                CrmLead::class,
                'crm_lead_tag'
            )
            ->withPivot([
                'id',
            ])
            ->withTimestamps();
    }
}
