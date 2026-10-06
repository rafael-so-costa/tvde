<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class HelpdeskTicket extends Model
{
    use HasUuids;

    protected $fillable=[
        'number',
        'tenant_id',
        'tenant_name',
        'opened_by_user_id',
        'assigned_to_user_id',
        'type',
        'category',
        'priority',
        'status',
        'feature_key',
        'origin_url',
        'subject',
        'tenant_unread_count',
        'saas_unread_count',
        'first_response_at',
        'last_message_at',
        'resolved_at',
        'resolved_by_user_id',
        'closed_at',
        'closed_by_user_id',
        'reopened_at',
    ];

    protected function casts(): array
    {
        return [
            'tenant_unread_count'=>'integer',
            'saas_unread_count'=>'integer',
            'first_response_at'=>'datetime',
            'last_message_at'=>'datetime',
            'resolved_at'=>'datetime',
            'closed_at'=>'datetime',
            'reopened_at'=>'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function openedBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'opened_by_user_id'
        );
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'assigned_to_user_id'
        );
    }

    public function resolvedBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'resolved_by_user_id'
        );
    }

    public function closedBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'closed_by_user_id'
        );
    }

    public function messages(): HasMany
    {
        return $this->hasMany(
            HelpdeskMessage::class,
            'ticket_id'
        );
    }

    public function latestMessage(): HasOne
    {
        return $this
            ->hasOne(
                HelpdeskMessage::class,
                'ticket_id'
            )
            ->latestOfMany(
                'created_at'
            );
    }

    public function rating(): HasOne
    {
        return $this->hasOne(
            HelpdeskRating::class,
            'ticket_id'
        );
    }
}
