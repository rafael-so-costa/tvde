<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SaasPlan extends Model
{
    use HasUuids;

    protected $fillable = [
        'codigo',
        'nome',
        'descricao',
        'ativo',
        'limits',
        'features',
        'ordem',
    ];

    protected function casts(): array
    {
        return [
            'ativo' => 'boolean',
            'limits' => 'array',
            'features' => 'array',
            'ordem' => 'integer',
        ];
    }

    public function tenants(): HasMany
    {
        return $this->hasMany(
            Tenant::class
        );
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(
            SaasSubscription::class
        );
    }
}
