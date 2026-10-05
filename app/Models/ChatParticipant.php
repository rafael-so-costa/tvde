<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChatParticipant extends Model
{
    use HasUuids;

    protected $fillable=[
        'conversation_id',
        'user_id',
        'role_snapshot',
        'joined_at',
        'last_read_at',
        'archived_at',
    ];

    protected function casts(): array
    {
        return [
            'joined_at'=>'datetime',
            'last_read_at'=>'datetime',
            'archived_at'=>'datetime',
        ];
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(
            ChatConversation::class,
            'conversation_id'
        );
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
