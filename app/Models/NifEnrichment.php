<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class NifEnrichment extends Model
{
    use HasUuids;

    public const PROVIDER_NIF_PT = 'nif_pt';

    public const STATUS_PENDING = 'pending';

    public const STATUS_SUCCESS = 'success';

    public const STATUS_NOT_FOUND = 'not_found';

    public const STATUS_INVALID = 'invalid';

    public const STATUS_ERROR = 'error';

    protected $fillable = [
        'nif',
        'provider',
        'lookup_status',
        'title',
        'seo_url',
        'address',
        'pc4',
        'pc3',
        'city',
        'activity',
        'company_status',
        'cae',
        'contacts',
        'structure',
        'geo',
        'place',
        'alias',
        'racius_url',
        'portugalio_url',
        'nif_validation',
        'is_nif',
        'provider_credits',
        'raw_data',
        'last_error',
        'lookup_count',
        'last_looked_up_at',
        'last_success_at',
    ];

    protected function casts(): array
    {
        return [
            'contacts' => 'array',
            'structure' => 'array',
            'geo' => 'array',
            'place' => 'array',
            'nif_validation' => 'boolean',
            'is_nif' => 'boolean',
            'provider_credits' => 'array',
            'raw_data' => 'array',
            'last_looked_up_at' => 'datetime',
            'last_success_at' => 'datetime',
        ];
    }

    public function attempts(): HasMany
    {
        return $this->hasMany(
            NifLookupAttempt::class
        );
    }
}
