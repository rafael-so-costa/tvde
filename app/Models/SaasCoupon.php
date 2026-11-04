<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class SaasCoupon extends Model
{
    use HasUuids;

    public const TYPE_FIXED = 'fixed';
    public const TYPE_PERCENTAGE = 'percentage';

    public const SCOPE_SAAS = 'saas_subscription';
    public const SCOPE_ADS = 'ad_order';
    public const SCOPE_BOTH = 'both';

    protected $table = 'saas_coupons';

    protected $fillable = [
        'code',
        'name',
        'description',
        'discount_type',
        'discount_value',
        'applies_to',
        'enabled',
        'first_payment_only',
        'min_subtotal',
        'max_redemptions',
        'max_per_customer',
        'starts_at',
        'expires_at',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'discount_value' => 'decimal:2',
            'min_subtotal' => 'decimal:2',
            'enabled' => 'boolean',
            'first_payment_only' => 'boolean',
            'max_redemptions' => 'integer',
            'max_per_customer' => 'integer',
            'starts_at' => 'datetime',
            'expires_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    protected function code(): Attribute
    {
        return Attribute::make(
            set: fn (string $value): string => strtoupper(trim($value)),
        );
    }

    public function redemptions(): HasMany
    {
        return $this->hasMany(
            SaasCouponRedemption::class,
            'saas_coupon_id'
        );
    }
}