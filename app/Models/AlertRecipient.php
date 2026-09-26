<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AlertRecipient extends Model
{
    use HasUuids;

    protected $attributes=[
        'active'=>true,
    ];

    protected $fillable=[
        'alert_id',
        'user_id',
        'active',
        'read_at',
        'acknowledged_at',
        'snoozed_until',
    ];

    protected function casts(): array
    {
        return [
            'active'=>'boolean',
            'read_at'=>'datetime',
            'acknowledged_at'=>'datetime',
            'snoozed_until'=>'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(
            Tenant::class
        );
    }

    public function alert(): BelongsTo
    {
        return $this->belongsTo(
            Alert::class
        );
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(
            User::class
        );
    }

    public function deliveries(): HasMany
    {
        return $this->hasMany(
            AlertDelivery::class
        );
    }
}
