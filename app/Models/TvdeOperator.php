<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TvdeOperator extends Model
{
    use HasUuids;

    protected $fillable = [
        'nif',
        'display_name',
    ];

    public function registrations(): HasMany
    {
        return $this->hasMany(
            TvdeOperatorRegistration::class
        );
    }

    public function changes(): HasMany
    {
        return $this->hasMany(
            TvdeImportChange::class
        );
    }
}
