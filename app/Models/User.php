<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, HasUuids, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'ativo',
        'last_login_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
            'ativo' => 'boolean',
        ];
    }

    public function profile(): HasOne
    {
        return $this->hasOne(
            Profile::class
        );
    }

    public function tenants(): BelongsToMany
    {
        return $this
            ->belongsToMany(
                Tenant::class,
                'tenant_users'
            )
            ->withPivot([
                'id',
                'status',
                'principal',
            ])
            ->withTimestamps();
    }

    public function roles(): BelongsToMany
    {
        return $this
            ->belongsToMany(
                Role::class,
                'user_roles'
            )
            ->withPivot([
                'id',
                'tenant_id',
            ])
            ->withTimestamps();
    }

    public function hasRole(
        string $role,
        ?string $tenantId = null
    ): bool {
        return UserRole::query()
            ->where(
                'user_id',
                $this->id
            )
            ->when(
                $tenantId,
                fn ($query) => $query
                    ->where(
                        'tenant_id',
                        $tenantId
                    ),
                fn ($query) => $query
                    ->whereNull(
                        'tenant_id'
                    )
            )
            ->whereHas(
                'role',
                fn ($query) => $query
                    ->where(
                        'codigo',
                        $role
                    )
            )
            ->exists();
    }

    public function isSuperAdmin(): bool
    {
        return $this->hasRole(
            'super_admin'
        );
    }

    public function funcionarios(): HasMany
    {
        return $this->hasMany(
            Funcionario::class
        );
    }

    public function assignedCrmLeads(): HasMany
    {
        return $this->hasMany(
            CrmLead::class,
            'assigned_to_user_id'
        );
    }

    public function createdCrmLeads(): HasMany
    {
        return $this->hasMany(
            CrmLead::class,
            'created_by_user_id'
        );
    }

    public function crmStageChanges(): HasMany
    {
        return $this->hasMany(
            CrmLeadStageHistory::class,
            'changed_by_user_id'
        );
    }

    public function assignedCrmActivities(): HasMany
    {
        return $this->hasMany(
            CrmActivity::class,
            'assigned_to_user_id'
        );
    }

    public function createdCrmActivities(): HasMany
    {
        return $this->hasMany(
            CrmActivity::class,
            'created_by_user_id'
        );
    }

    public function nifEnrichmentBatches(): HasMany
    {
        return $this->hasMany(
            NifEnrichmentBatch::class,
            'created_by_user_id'
        );
    }
}
