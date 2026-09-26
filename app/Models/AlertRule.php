<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AlertRule extends Model
{
    use HasUuids;

    protected $attributes=[
        'severity'=>'medium',
        'enabled'=>true,
    ];

    protected $fillable=[
        'code',
        'name',
        'category',
        'description',
        'severity',
        'enabled',
        'channels',
        'recipient_config',
        'trigger_config',
        'repeat_config',
    ];

    protected function casts(): array
    {
        return [
            'enabled'=>'boolean',
            'channels'=>'array',
            'recipient_config'=>'array',
            'trigger_config'=>'array',
            'repeat_config'=>'array',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(
            Tenant::class
        );
    }

    public function alerts(): HasMany
    {
        return $this->hasMany(
            Alert::class,
            'rule_id'
        );
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'created_by'
        );
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'updated_by'
        );
    }
}
