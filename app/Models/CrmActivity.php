<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CrmActivity extends Model
{
    use HasUuids;

    public const TYPE_NOTE = 'note';

    public const TYPE_CALL = 'call';

    public const TYPE_EMAIL = 'email';

    public const TYPE_WHATSAPP = 'whatsapp';

    public const TYPE_MEETING = 'meeting';

    public const TYPE_DEMO = 'demo';

    public const TYPE_PROPOSAL = 'proposal';

    public const TYPE_TASK = 'task';

    public const TYPE_FOLLOW_UP = 'follow_up';

    public const STATUS_PLANNED = 'planned';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_CANCELED = 'canceled';

    protected $fillable = [
        'crm_lead_id',
        'assigned_to_user_id',
        'created_by_user_id',
        'type',
        'status',
        'subject',
        'description',
        'outcome',
        'metadata',
        'scheduled_at',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'scheduled_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public static function types(): array
    {
        return [
            self::TYPE_NOTE,
            self::TYPE_CALL,
            self::TYPE_EMAIL,
            self::TYPE_WHATSAPP,
            self::TYPE_MEETING,
            self::TYPE_DEMO,
            self::TYPE_PROPOSAL,
            self::TYPE_TASK,
            self::TYPE_FOLLOW_UP,
        ];
    }

    public static function statuses(): array
    {
        return [
            self::STATUS_PLANNED,
            self::STATUS_COMPLETED,
            self::STATUS_CANCELED,
        ];
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(
            CrmLead::class,
            'crm_lead_id'
        );
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'assigned_to_user_id'
        );
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'created_by_user_id'
        );
    }
}
