<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TvdeImportChange extends Model
{
    use HasUuids;

    public const TYPE_CREATED = 'created';

    public const TYPE_UPDATED = 'updated';

    public const TYPE_REMOVED = 'removed';

    public const TYPE_RESTORED = 'restored';

    protected $fillable = [
        'tvde_import_id',
        'tvde_operator_id',
        'tvde_operator_registration_id',
        'change_type',
        'changed_fields',
        'before_data',
        'after_data',
    ];

    protected function casts(): array
    {
        return [
            'changed_fields' => 'array',
            'before_data' => 'array',
            'after_data' => 'array',
        ];
    }

    public function import(): BelongsTo
    {
        return $this->belongsTo(
            TvdeImport::class,
            'tvde_import_id'
        );
    }

    public function operator(): BelongsTo
    {
        return $this->belongsTo(
            TvdeOperator::class,
            'tvde_operator_id'
        );
    }

    public function registration(): BelongsTo
    {
        return $this->belongsTo(
            TvdeOperatorRegistration::class,
            'tvde_operator_registration_id'
        );
    }
}
