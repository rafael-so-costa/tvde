<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChatMessage extends Model
{
    use HasUuids;

    protected $fillable=[
        'conversation_id',
        'sender_user_id',
        'body',
        'kind',
        'edited_at',
    ];

    protected function casts(): array
    {
        return [
            'edited_at'=>'datetime',
        ];
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(
            ChatConversation::class,
            'conversation_id'
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
            ChatAttachment::class,
            'message_id'
        );
    }
}
