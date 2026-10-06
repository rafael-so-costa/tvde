<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class HelpdeskMessage extends Model
{
    use HasUuids;

    protected $fillable=[
        'ticket_id',
        'sender_user_id',
        'sender_side',
        'body',
        'system',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'system'=>'boolean',
            'metadata'=>'array',
        ];
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(
            HelpdeskTicket::class,
            'ticket_id'
        );
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'sender_user_id'
        );
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(
            HelpdeskAttachment::class,
            'message_id'
        );
    }
}
