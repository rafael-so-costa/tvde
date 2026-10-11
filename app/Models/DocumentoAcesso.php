<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DocumentoAcesso extends Model
{
    use HasUuids;

    protected $fillable=[
        'documento_id',
        'user_id',
        'tenant_context_id',
        'contexto',
        'acao',
        'ip_address',
        'user_agent',
        'metadados',
    ];

    protected function casts(): array
    {
        return [
            'metadados'=>'array',
        ];
    }

    public function documento(): BelongsTo
    {
        return $this->belongsTo(Documento::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function tenantContext(): BelongsTo
    {
        return $this->belongsTo(
            Tenant::class,
            'tenant_context_id'
        );
    }
}