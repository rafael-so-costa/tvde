<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class ChatConversation extends Model
{
    use HasUuids;

    protected $fillable=[
        'tenant_id',
        'created_by_user_id',
        'type',
        'source',
        'subject',
        'audience',
        'allow_replies',
        'last_message_at',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'allow_replies'=>'boolean',
            'last_message_at'=>'datetime',
            'metadata'=>'array',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class,'created_by_user_id');
    }

    public function participants(): HasMany
    {
        return $this->hasMany(ChatParticipant::class,'conversation_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(ChatMessage::class,'conversation_id');
    }

    public function latestMessage(): HasOne
    {
        return $this
            ->hasOne(ChatMessage::class,'conversation_id')
            ->latestOfMany('created_at');
    }
}
