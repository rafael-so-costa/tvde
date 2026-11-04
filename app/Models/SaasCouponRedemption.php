<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class SaasCouponRedemption extends Model
{
    use HasUuids;

    public const STATUS_RESERVED = 'reserved';
    public const STATUS_REDEEMED = 'redeemed';
    public const STATUS_RELEASED = 'released';
    public const STATUS_EXPIRED = 'expired';

    protected $table = 'saas_coupon_redemptions';

    protected $fillable = [
        'saas_coupon_id',
        'customer_type',
        'customer_id',
        'source_type',
        'source_id',
        'billing_charge_id',
        'status',
        'subtotal_amount',
        'discount_amount',
        'currency',
        'idempotency_key',
        'reserved_until',
        'redeemed_at',
        'released_at',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'subtotal_amount' => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'reserved_until' => 'datetime',
            'redeemed_at' => 'datetime',
            'released_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    public function coupon(): BelongsTo
    {
        return $this->belongsTo(
            SaasCoupon::class,
            'saas_coupon_id'
        );
    }

    public function charge(): BelongsTo
    {
        return $this->belongsTo(
            BillingCharge::class,
            'billing_charge_id'
        );
    }
}