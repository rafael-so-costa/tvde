<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Tenant extends Model
{
    use HasUuids;

    protected $fillable = [
        'nome',
        'slug',
        'nif',
        'email',
        'telefone',
        'ativo',
        'settings',
        'saas_plan_id',
    ];

    protected function casts(): array
    {
        return [
            'ativo' => 'boolean',
            'settings' => 'array',
        ];
    }

    public function users(): BelongsToMany
    {
        return $this
            ->belongsToMany(
                User::class,
                'tenant_users'
            )
            ->withPivot([
                'id',
                'status',
                'principal',
            ])
            ->withTimestamps();
    }

    public function tenantUsers(): HasMany
    {
        return $this->hasMany(
            TenantUser::class
        );
    }

    public function empresas(): HasMany
    {
        return $this->hasMany(
            Empresa::class
        );
    }

    public function proprietarios(): HasMany
    {
        return $this->hasMany(
            Proprietario::class
        );
    }

    public function veiculos(): HasMany
    {
        return $this->hasMany(
            Veiculo::class
        );
    }

    public function motoristas(): HasMany
    {
        return $this->hasMany(
            Motorista::class
        );
    }

    public function funcionarios(): HasMany
    {
        return $this->hasMany(
            Funcionario::class
        );
    }

    public function saasPlan(): BelongsTo
    {
        return $this->belongsTo(
            SaasPlan::class
        );
    }

    public function saasSubscription(): HasOne
    {
        return $this->hasOne(
            SaasSubscription::class
        );
    }

    public function convertedCrmLead(): HasOne
    {
        return $this->hasOne(
            CrmLead::class,
            'converted_tenant_id'
        );
    }
}
