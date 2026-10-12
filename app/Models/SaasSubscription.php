<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SaasSubscription extends Model
{
    use HasUuids;

    public const STATUS_TRIALING = 'trialing';

    public const STATUS_ACTIVE = 'active';

    public const STATUS_PAST_DUE = 'past_due';

    public const STATUS_SUSPENDED = 'suspended';

    public const STATUS_CANCELED = 'canceled';

    public const BILLING_MONTHLY = 'monthly';

    public const BILLING_YEARLY = 'yearly';

    protected $fillable = [
        'tenant_id',
        'saas_plan_id',
        'status',
        'billing_cycle',
        'price_amount',
        'currency',
        'starts_at',
        'trial_ends_at',
        'current_period_starts_at',
        'current_period_ends_at',
        'cancels_at',
        'canceled_at',
        'external_provider',
        'external_subscription_id',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'price_amount' => 'decimal:2',
            'starts_at' => 'datetime',
            'trial_ends_at' => 'datetime',
            'current_period_starts_at' => 'datetime',
            'current_period_ends_at' => 'datetime',
            'cancels_at' => 'datetime',
            'canceled_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(
            Tenant::class
        );
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(
            SaasPlan::class,
            'saas_plan_id'
        );
    }

    public function billingCharges(): HasMany
    {
        return $this
            ->hasMany(
                BillingCharge::class,
                'source_id'
            )
            ->where(
                'source_type',
                BillingCharge::SOURCE_SAAS_SUBSCRIPTION
            );
    }
}
