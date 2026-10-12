<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BillingPayment extends Model
{
    use HasUuids;

    public const STATUS_PENDING =
        'pending';

    public const STATUS_PAID =
        'paid';

    public const STATUS_FAILED =
        'failed';

    public const STATUS_EXPIRED =
        'expired';

    public const STATUS_CANCELED =
        'canceled';

    public const STATUS_REFUNDED =
        'refunded';

    public const METHOD_MULTIBANCO =
        'multibanco';

    protected $fillable = [
        'billing_charge_id',
        'provider',
        'method',
        'status',
        'amount',
        'currency',
        'external_id',
        'provider_reference',
        'entity',
        'reference',
        'expires_at',
        'paid_at',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'expires_at' => 'datetime',
            'paid_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    public function charge(): BelongsTo
    {
        return $this->belongsTo(
            BillingCharge::class,
            'billing_charge_id'
        );
    }
}