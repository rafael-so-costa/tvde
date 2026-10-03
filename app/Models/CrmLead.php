<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CrmLead extends Model
{
    use HasUuids;

    public const SOURCE_MANUAL = 'manual';

    public const SOURCE_TVDE = 'tvde';

    public const SOURCE_WEB = 'web';

    public const SOURCE_IMPORT = 'import';

    public const SOURCE_REFERRAL = 'referral';

    public const PRIORITY_LOW = 'low';

    public const PRIORITY_NORMAL = 'normal';

    public const PRIORITY_HIGH = 'high';

    public const PRIORITY_URGENT = 'urgent';

    protected $fillable = [
        'tvde_operator_id',
        'current_stage_id',
        'assigned_to_user_id',
        'created_by_user_id',
        'converted_tenant_id',
        'nif',
        'company_name',
        'contact_name',
        'email',
        'phone',
        'website',
        'district',
        'municipality',
        'source',
        'source_detail',
        'priority',
        'notes',
        'lost_reason',
        'metadata',
        'last_contacted_at',
        'next_follow_up_at',
        'converted_at',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'last_contacted_at' => 'datetime',
            'next_follow_up_at' => 'datetime',
            'converted_at' => 'datetime',
        ];
    }

    public static function sources(): array
    {
        return [
            self::SOURCE_MANUAL,
            self::SOURCE_TVDE,
            self::SOURCE_WEB,
            self::SOURCE_IMPORT,
            self::SOURCE_REFERRAL,
        ];
    }

    public static function priorities(): array
    {
        return [
            self::PRIORITY_LOW,
            self::PRIORITY_NORMAL,
            self::PRIORITY_HIGH,
            self::PRIORITY_URGENT,
        ];
    }

    public function tvdeOperator(): BelongsTo
    {
        return $this->belongsTo(
            TvdeOperator::class
        );
    }

    public function currentStage(): BelongsTo
    {
        return $this->belongsTo(
            CrmPipelineStage::class,
            'current_stage_id'
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

    public function convertedTenant(): BelongsTo
    {
        return $this->belongsTo(
            Tenant::class,
            'converted_tenant_id'
        );
    }

    public function stageHistories(): HasMany
    {
        return $this->hasMany(
            CrmLeadStageHistory::class
        );
    }

    public function activities(): HasMany
    {
        return $this->hasMany(
            CrmActivity::class
        );
    }

    public function tags(): BelongsToMany
    {
        return $this
            ->belongsToMany(
                CrmTag::class,
                'crm_lead_tag'
            )
            ->withPivot([
                'id',
            ])
            ->withTimestamps();
    }
}
