<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NifEnrichmentBatchItem extends Model
{
    use HasUuids;

    public const STATUS_PENDING = 'pending';

    public const STATUS_PROCESSING = 'processing';

    public const STATUS_SUCCESS = 'success';

    public const STATUS_ERROR = 'error';

    public const STATUS_SKIPPED = 'skipped';

    protected $fillable = [
        'nif_enrichment_batch_id',
        'tvde_operator_id',
        'nif_enrichment_id',
        'nif_lookup_attempt_id',
        'nif',
        'status',
        'used_cache',
        'external_lookup',
        'attempt_count',
        'error_message',
        'started_at',
        'processed_at',
    ];

    protected function casts(): array
    {
        return [
            'used_cache' => 'boolean',
            'external_lookup' => 'boolean',
            'attempt_count' => 'integer',
            'started_at' => 'datetime',
            'processed_at' => 'datetime',
        ];
    }

    public static function statuses(): array
    {
        return [
            self::STATUS_PENDING,
            self::STATUS_PROCESSING,
            self::STATUS_SUCCESS,
            self::STATUS_ERROR,
            self::STATUS_SKIPPED,
        ];
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(
            NifEnrichmentBatch::class,
            'nif_enrichment_batch_id'
        );
    }

    public function tvdeOperator(): BelongsTo
    {
        return $this->belongsTo(
            TvdeOperator::class
        );
    }

    public function enrichment(): BelongsTo
    {
        return $this->belongsTo(
            NifEnrichment::class,
            'nif_enrichment_id'
        );
    }

    public function lookupAttempt(): BelongsTo
    {
        return $this->belongsTo(
            NifLookupAttempt::class,
            'nif_lookup_attempt_id'
        );
    }
}
