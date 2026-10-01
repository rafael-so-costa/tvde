<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TvdeImport extends Model
{
    use HasUuids;

    public const SOURCE_IMT = 'imt_continental';

    public const SOURCE_RAM = 'ram';

    public const STATUS_PROCESSING = 'processing';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_FAILED = 'failed';

    protected $fillable = [
        'source',
        'reference_date',
        'original_filename',
        'file_hash',
        'status',
        'total_records',
        'new_records',
        'changed_records',
        'removed_records',
        'restored_records',
        'unchanged_records',
        'metadata',
        'imported_by',
        'started_at',
        'completed_at',
        'error_message',
    ];

    protected function casts(): array
    {
        return [
            'reference_date' => 'date',
            'metadata' => 'array',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'imported_by'
        );
    }

    public function changes(): HasMany
    {
        return $this->hasMany(
            TvdeImportChange::class
        );
    }
}
