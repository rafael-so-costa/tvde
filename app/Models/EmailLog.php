<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmailLog extends Model
{
    use HasUuids;

    protected $fillable=[
        'tenant_id',
        'initiated_by_user_id',
        'recipient_email',
        'subject',
        'category',
        'mailer',
        'status',
        'attempts',
        'related_type',
        'related_id',
        'error',
        'sent_at',
        'failed_at',
    ];

    protected function casts():array
    {
        return[
            'attempts'=>'integer',
            'sent_at'=>'datetime',
            'failed_at'=>'datetime',
        ];
    }

    public function tenant():BelongsTo
    {
        return $this->belongsTo(
            Tenant::class
        );
    }

    public function initiatedBy():BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'initiated_by_user_id'
        );
    }
}