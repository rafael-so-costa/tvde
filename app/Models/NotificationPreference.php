<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NotificationPreference extends Model
{
    use HasUuids;

    protected $attributes=[
        'category'=>'*',
        'enabled'=>true,
        'minimum_severity'=>'low',
        'delivery_mode'=>'immediate',
    ];

    protected $fillable=[
        'category',
        'channel',
        'enabled',
        'minimum_severity',
        'delivery_mode',
        'quiet_hours_start',
        'quiet_hours_end',
        'timezone',
    ];

    protected function casts(): array
    {
        return [
            'enabled'=>'boolean',
        ];
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
