<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TvdeOperatorRegistration extends Model
{
    use HasUuids;

    public const JURISDICTION_CONTINENTAL =
        'continental';

    public const JURISDICTION_MADEIRA =
        'madeira';

    protected $fillable = [
        'tvde_operator_id',
        'source',
        'jurisdiction',
        'source_key',
        'denomination',
        'license_number',
        'district',
        'municipality',
        'postal_locality',
        'active',
        'record_hash',
        'raw_data',
        'first_seen_import_id',
        'last_seen_import_id',
        'removed_in_import_id',
        'first_seen_at',
        'last_seen_at',
        'removed_at',
    ];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'raw_data' => 'array',
            'first_seen_at' => 'datetime',
            'last_seen_at' => 'datetime',
            'removed_at' => 'datetime',
        ];
    }

    public function operator(): BelongsTo
    {
        return $this->belongsTo(
            TvdeOperator::class,
            'tvde_operator_id'
        );
    }

    public function firstSeenImport(): BelongsTo
    {
        return $this->belongsTo(
            TvdeImport::class,
            'first_seen_import_id'
        );
    }

    public function lastSeenImport(): BelongsTo
    {
        return $this->belongsTo(
            TvdeImport::class,
            'last_seen_import_id'
        );
    }

    public function removedInImport(): BelongsTo
    {
        return $this->belongsTo(
            TvdeImport::class,
            'removed_in_import_id'
        );
    }

    public function changes(): HasMany
    {
        return $this->hasMany(
            TvdeImportChange::class
        );
    }
}
