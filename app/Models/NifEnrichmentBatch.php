<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class NifEnrichmentBatch extends Model
{
    use HasUuids;

    public const STATUS_PENDING = 'pending';

    public const STATUS_PROCESSING = 'processing';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_PARTIAL = 'partial';

    public const STATUS_ERROR = 'error';

    public const STATUS_CANCELED = 'canceled';

    protected $fillable = [
        'created_by_user_id',
        'name',
        'status',
        'force_refresh',
        'total_items',
        'pending_items',
        'processing_items',
        'success_items',
        'error_items',
        'skipped_items',
        'cache_hits',
        'external_lookups',
        'metadata',
        'error_message',
        'started_at',
        'last_processed_at',
        'completed_at',
        'canceled_at',
    ];

    protected function casts(): array
    {
        return [
            'force_refresh' => 'boolean',
            'total_items' => 'integer',
            'pending_items' => 'integer',
            'processing_items' => 'integer',
            'success_items' => 'integer',
            'error_items' => 'integer',
            'skipped_items' => 'integer',
            'cache_hits' => 'integer',
            'external_lookups' => 'integer',
            'metadata' => 'array',
            'started_at' => 'datetime',
            'last_processed_at' => 'datetime',
            'completed_at' => 'datetime',
            'canceled_at' => 'datetime',
        ];
    }

    public static function statuses(): array
    {
        return [
            self::STATUS_PENDING,
            self::STATUS_PROCESSING,
            self::STATUS_COMPLETED,
            self::STATUS_PARTIAL,
            self::STATUS_ERROR,
            self::STATUS_CANCELED,
        ];
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'created_by_user_id'
        );
    }

    public function items(): HasMany
    {
        return $this->hasMany(
            NifEnrichmentBatchItem::class
        );
    }
}
