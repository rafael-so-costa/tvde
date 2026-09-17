<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LogAuditoriaContrato extends Model
{
    use HasUuids;

    protected $table = 'logs_auditoria_contratos';

    public $timestamps = false;

    protected $fillable = [
        'acao',
        'detalhes',
        'ip_address',
    ];

    protected function casts(): array
    {
        return [
            'detalhes' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function contrato(): BelongsTo
    {
        return $this->belongsTo(Contrato::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
