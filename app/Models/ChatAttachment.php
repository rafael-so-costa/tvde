<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChatAttachment extends Model
{
    use HasUuids;

    protected $fillable=[
        'message_id',
        'disk',
        'path',
        'original_name',
        'mime_type',
        'size',
        'kind',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'metadata'=>'array',
        ];
    }

    public function message(): BelongsTo
    {
        return $this->belongsTo(
            ChatMessage::class,
            'message_id'
        );
    }
}
