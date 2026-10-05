<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AdCampaign extends Model
{
    use HasUuids;

    public const SOURCE_SAAS = 'saas';

    public const SOURCE_TENANT = 'tenant';

    public const SOURCE_EXTERNAL = 'external';

    public const KIND_HOUSE = 'house';

    public const KIND_TENANT_INTERNAL = 'tenant_internal';

    public const KIND_COMMERCIAL = 'commercial';

    public const STATUS_DRAFT = 'draft';

    public const STATUS_SUBMITTED = 'submitted';

    public const STATUS_IN_REVIEW = 'in_review';

    public const STATUS_CHANGES_REQUESTED = 'changes_requested';

    public const STATUS_REJECTED = 'rejected';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_AWAITING_PAYMENT = 'awaiting_payment';

    public const STATUS_SCHEDULED = 'scheduled';

    public const STATUS_ACTIVE = 'active';

    public const STATUS_PAUSED = 'paused';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_CANCELED = 'canceled';

    public const STATUS_SUSPENDED = 'suspended';

    public const PAYMENT_NOT_REQUIRED = 'not_required';

    public const PAYMENT_PENDING = 'pending';

    public const PAYMENT_PAID = 'paid';

    public const PAYMENT_REFUNDED = 'refunded';

    public const PAYMENT_FAILED = 'failed';

    public const AUDIENCE_DRIVER = 'driver';

    public const AUDIENCE_OWNER = 'owner';

    public const AUDIENCE_MANAGER = 'manager';

    protected $fillable = [
        'advertiser_id',
        'tenant_id',
        'category_id',
        'created_by_user_id',
        'source',
        'kind',
        'name',
        'title',
        'description',
        'status',
        'pricing_model',
        'quoted_price',
        'currency',
        'payment_required',
        'payment_status',
        'priority',
        'weight',
        'max_impressions',
        'max_clicks',
        'frequency_cap_daily',
        'start_at',
        'end_at',
        'submitted_at',
        'approved_at',
        'approved_by_user_id',
        'rejected_at',
        'rejection_reason',
        'activated_at',
        'paused_at',
        'completed_at',
        'admin_notes',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'quoted_price' => 'decimal:2',
            'payment_required' => 'boolean',
            'start_at' => 'datetime',
            'end_at' => 'datetime',
            'submitted_at' => 'datetime',
            'approved_at' => 'datetime',
            'rejected_at' => 'datetime',
            'activated_at' => 'datetime',
            'paused_at' => 'datetime',
            'completed_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    public static function sources(): array
    {
        return [
            self::SOURCE_SAAS,
            self::SOURCE_TENANT,
            self::SOURCE_EXTERNAL,
        ];
    }

    public static function kinds(): array
    {
        return [
            self::KIND_HOUSE,
            self::KIND_TENANT_INTERNAL,
            self::KIND_COMMERCIAL,
        ];
    }

    public static function audiences(): array
    {
        return [
            self::AUDIENCE_DRIVER,
            self::AUDIENCE_OWNER,
            self::AUDIENCE_MANAGER,
        ];
    }

    public static function statuses(): array
    {
        return [
            self::STATUS_DRAFT,
            self::STATUS_SUBMITTED,
            self::STATUS_IN_REVIEW,
            self::STATUS_CHANGES_REQUESTED,
            self::STATUS_REJECTED,
            self::STATUS_APPROVED,
            self::STATUS_AWAITING_PAYMENT,
            self::STATUS_SCHEDULED,
            self::STATUS_ACTIVE,
            self::STATUS_PAUSED,
            self::STATUS_COMPLETED,
            self::STATUS_CANCELED,
            self::STATUS_SUSPENDED,
        ];
    }

    public function advertiser(): BelongsTo
    {
        return $this->belongsTo(AdAdvertiser::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(AdCategory::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by_user_id');
    }

    public function zones(): BelongsToMany
    {
        return $this->belongsToMany(
            AdZone::class,
            'ad_campaign_zone',
            'campaign_id',
            'zone_id'
        );
    }

    public function creatives(): HasMany
    {
        return $this->hasMany(AdCreative::class, 'campaign_id');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(AdReview::class, 'campaign_id');
    }

    public function events(): HasMany
    {
        return $this->hasMany(AdCampaignEvent::class, 'campaign_id');
    }

    public function orders(): HasMany
    {
        return $this->hasMany(AdOrder::class, 'campaign_id');
    }

    public function dailyStats(): HasMany
    {
        return $this->hasMany(AdDailyStat::class, 'campaign_id');
    }
}
