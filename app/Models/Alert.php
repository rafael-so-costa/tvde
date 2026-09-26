<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Alert extends Model
{
    use HasUuids;

    protected $attributes=[
        'status'=>'open',
        'severity'=>'medium',
    ];

    protected $fillable=[
        'rule_id',
        'rule_code',
        'source_type',
        'source_id',
        'dedup_key',
        'fingerprint',
        'active_key',
        'category',
        'severity',
        'status',
        'title',
        'message',
        'due_at',
        'triggered_at',
        'resolved_at',
        'resolution_type',
        'resolution_note',
        'action_url',
        'metadata',
        'resolved_by',
    ];

    protected function casts(): array
    {
        return [
            'due_at'=>'datetime',
            'triggered_at'=>'datetime',
            'resolved_at'=>'datetime',
            'metadata'=>'array',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(
            Tenant::class
        );
    }

    public function rule(): BelongsTo
    {
        return $this->belongsTo(
            AlertRule::class,
            'rule_id'
        );
    }

    public function recipients(): HasMany
    {
        return $this->hasMany(
            AlertRecipient::class
        );
    }

    public function resolvedBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'resolved_by'
        );
    }
}
