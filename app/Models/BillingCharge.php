<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BillingCharge extends Model
{
    use HasUuids;

    public const SOURCE_SAAS_SUBSCRIPTION =
        'saas_subscription';

    public const SOURCE_AD_ORDER =
        'ad_order';

    public const STATUS_PENDING =
        'pending';

    public const STATUS_PAID =
        'paid';

    public const STATUS_CANCELED =
        'canceled';

    public const STATUS_EXPIRED =
        'expired';

    public const STATUS_REFUNDED =
        'refunded';

    protected $fillable = [
        'tenant_id',
        'source_type',
        'source_id',
        'number',
        'status',
        'description',
        'period_start',
        'period_end',
        'subtotal',
        'discount',
        'total',
        'currency',
        'due_at',
        'paid_at',
        'idempotency_key',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'period_start' => 'datetime',
            'period_end' => 'datetime',
            'subtotal' => 'decimal:2',
            'discount' => 'decimal:2',
            'total' => 'decimal:2',
            'due_at' => 'datetime',
            'paid_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(
            Tenant::class
        );
    }

    public function payments(): HasMany
    {
        return $this->hasMany(
            BillingPayment::class
        );
    }
}