<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NifLookupAttempt extends Model
{
    use HasUuids;

    public const STATUS_CACHE_HIT = 'cache_hit';

    public const STATUS_SUCCESS = 'success';

    public const STATUS_NOT_FOUND = 'not_found';

    public const STATUS_INVALID = 'invalid';

    public const STATUS_ERROR = 'error';

    protected $fillable = [
        'nif_enrichment_id',
        'nif',
        'provider',
        'status',
        'http_status',
        'provider_result',
        'credit_type',
        'credits',
        'duration_ms',
        'error_message',
        'requested_at',
    ];

    protected function casts(): array
    {
        return [
            'credits' => 'array',
            'requested_at' => 'datetime',
        ];
    }

    public function enrichment(): BelongsTo
    {
        return $this->belongsTo(
            NifEnrichment::class,
            'nif_enrichment_id'
        );
    }
}
