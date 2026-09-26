<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AlertDelivery extends Model
{
    use HasUuids;

    protected $attributes=[
        'status'=>'queued',
        'attempts'=>0,
    ];

    protected $fillable=[
        'alert_recipient_id',
        'channel',
        'status',
        'attempts',
        'provider',
        'provider_message_id',
        'queued_at',
        'sent_at',
        'delivered_at',
        'failed_at',
        'error',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'attempts'=>'integer',
            'queued_at'=>'datetime',
            'sent_at'=>'datetime',
            'delivered_at'=>'datetime',
            'failed_at'=>'datetime',
            'metadata'=>'array',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(
            Tenant::class
        );
    }

    public function recipient(): BelongsTo
    {
        return $this->belongsTo(
            AlertRecipient::class,
            'alert_recipient_id'
        );
    }
}
