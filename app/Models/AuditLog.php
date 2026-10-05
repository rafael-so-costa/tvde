<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

class AuditLog extends Model
{
    use HasUuids;

    public const UPDATED_AT=null;

    protected $fillable=[
        'tenant_id',
        'actor_user_id',
        'module',
        'action',
        'source',
        'auditable_type',
        'auditable_id',
        'subject_label',
        'description',
        'old_values',
        'new_values',
        'actor_name',
        'actor_email',
        'ip_address',
        'request_method',
        'request_path',
        'user_agent',
    ];

    protected function casts(): array
    {
        return [
            'old_values'=>'array',
            'new_values'=>'array',
            'created_at'=>'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::updating(function(){
            throw new LogicException(
                'Registos de auditoria não podem ser alterados.'
            );
        });

        static::deleting(function(){
            throw new LogicException(
                'Registos de auditoria não podem ser eliminados.'
            );
        });
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(
            Tenant::class,
            'tenant_id'
        );
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'actor_user_id'
        );
    }
}
