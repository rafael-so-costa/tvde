<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HelpdeskRating extends Model
{
    use HasUuids;

    protected $fillable=[
        'ticket_id',
        'tenant_id',
        'submitted_by_user_id',
        'rating',
        'comment',
    ];

    protected function casts(): array
    {
        return [
            'rating'=>'integer',
        ];
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(
            HelpdeskTicket::class,
            'ticket_id'
        );
    }

    public function submittedBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'submitted_by_user_id'
        );
    }
}
