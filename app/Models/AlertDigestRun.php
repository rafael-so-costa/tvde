<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AlertDigestRun extends Model
{
    use HasUuids;

    protected $attributes=[
        'channel'=>'email',
        'status'=>'queued',
        'alert_count'=>0,
        'attempts'=>0,
    ];

    protected $fillable=[
        'channel',
        'digest_date',
        'timezone',
        'status',
        'alert_count',
        'alert_recipient_ids',
        'attempts',
        'provider',
        'queued_at',
        'sent_at',
        'failed_at',
        'error',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'digest_date'=>'date:Y-m-d',
            'alert_count'=>'integer',
            'alert_recipient_ids'=>'array',
            'attempts'=>'integer',
            'queued_at'=>'datetime',
            'sent_at'=>'datetime',
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

    public function user(): BelongsTo
    {
        return $this->belongsTo(
            User::class
        );
    }
}
